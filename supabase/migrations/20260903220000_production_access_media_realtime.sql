begin;

-- ============================================================
-- BTME™ BUILD 27
-- Production dating eligibility + entitlement authority
-- + controlled dating-media authorization + realtime Spark.
-- ============================================================

-- ------------------------------------------------------------
-- SERVER-OWNED ENTITLEMENTS
-- ------------------------------------------------------------

create table public.member_entitlements (
  member_id uuid primary key
    references public.members(id)
    on delete cascade,

  tier text not null default 'none',
  status text not null default 'inactive',
  source text not null default 'none',

  external_reference text,
  current_period_ends_at timestamptz,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_entitlements_tier_check
    check (tier in ('none', 'premium')),

  constraint member_entitlements_status_check
    check (
      status in (
        'inactive',
        'active',
        'grace_period',
        'expired',
        'revoked'
      )
    ),

  constraint member_entitlements_source_check
    check (
      source in (
        'none',
        'apple_app_store',
        'manual_admin',
        'migration'
      )
    )
);

alter table public.member_entitlements
enable row level security;

revoke all
on table public.member_entitlements
from public;

revoke all
on table public.member_entitlements
from anon;

revoke all
on table public.member_entitlements
from authenticated;

grant select
on table public.member_entitlements
to authenticated;

create policy member_entitlements_select_self
on public.member_entitlements
for select
to authenticated
using (member_id = auth.uid());

-- There are intentionally no authenticated INSERT, UPDATE
-- or DELETE grants. The mobile client cannot award itself
-- Premium membership.

-- ------------------------------------------------------------
-- VERIFICATION AUTHORITY
-- ------------------------------------------------------------

create or replace function private.btme_member_is_verified(
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.identity_verifications iv
    where iv.member_id = p_member_id
      and iv.status = 'verified'
      and iv.verified_at is not null
  );
$$;

revoke all
on function private.btme_member_is_verified(uuid)
from public;

revoke all
on function private.btme_member_is_verified(uuid)
from anon;

revoke all
on function private.btme_member_is_verified(uuid)
from authenticated;

-- ------------------------------------------------------------
-- ENTITLEMENT AUTHORITY
-- ------------------------------------------------------------

create or replace function private.btme_member_has_active_entitlement(
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.member_entitlements e
    where e.member_id = p_member_id
      and e.tier = 'premium'
      and e.status in ('active', 'grace_period')
      and e.verified_at is not null
      and (
        e.current_period_ends_at is null
        or e.current_period_ends_at > now()
      )
  );
$$;

revoke all
on function private.btme_member_has_active_entitlement(uuid)
from public;

revoke all
on function private.btme_member_has_active_entitlement(uuid)
from anon;

revoke all
on function private.btme_member_has_active_entitlement(uuid)
from authenticated;

-- ------------------------------------------------------------
-- CAN-DATE AUTHORITY
-- ------------------------------------------------------------

create or replace function private.btme_member_can_date(
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.members m
      join public.profiles p
        on p.member_id = m.id
      where m.id = p_member_id
        and m.account_status = 'active'
        and p.profile_complete = true
        and p.birth_date <=
          (current_date - interval '18 years')::date
    )
    and private.btme_member_is_verified(p_member_id)
    and private.btme_member_has_active_entitlement(p_member_id);
$$;

revoke all
on function private.btme_member_can_date(uuid)
from public;

revoke all
on function private.btme_member_can_date(uuid)
from anon;

revoke all
on function private.btme_member_can_date(uuid)
from authenticated;

-- ------------------------------------------------------------
-- SELF MEMBERSHIP PROJECTION
-- ------------------------------------------------------------

create or replace function public.get_my_membership_entitlement()
returns table (
  tier text,
  status text,
  source text,
  current_period_ends_at timestamptz,
  verified_at timestamptz,
  can_date boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  return query
  select
    coalesce(e.tier, 'none'::text),
    coalesce(e.status, 'inactive'::text),
    coalesce(e.source, 'none'::text),
    e.current_period_ends_at,
    e.verified_at,
    private.btme_member_can_date(v_member_id)
  from (
    select v_member_id as member_id
  ) me
  left join public.member_entitlements e
    on e.member_id = me.member_id;
end;
$$;

revoke all
on function public.get_my_membership_entitlement()
from public;

revoke all
on function public.get_my_membership_entitlement()
from anon;

grant execute
on function public.get_my_membership_entitlement()
to authenticated;

-- ------------------------------------------------------------
-- CONTROLLED MEDIA AUTHORIZATION
--
-- This function does NOT return storage paths.
-- It only tells the privileged Edge Function whether the
-- authenticated viewer may receive dating media for target.
-- ------------------------------------------------------------

create or replace function public.can_view_dating_media(
  p_target_member_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_target_member_id is null then
    return false;
  end if;

  if p_target_member_id = v_member_id then
    return true;
  end if;

  if not private.btme_member_can_date(v_member_id) then
    return false;
  end if;

  if not private.btme_member_can_date(p_target_member_id) then
    return false;
  end if;

  if exists (
    select 1
    from public.member_blocks b
    where
      (
        b.blocker_id = v_member_id
        and b.blocked_id = p_target_member_id
      )
      or
      (
        b.blocker_id = p_target_member_id
        and b.blocked_id = v_member_id
      )
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all
on function public.can_view_dating_media(uuid)
from public;

revoke all
on function public.can_view_dating_media(uuid)
from anon;

grant execute
on function public.can_view_dating_media(uuid)
to authenticated;

-- ------------------------------------------------------------
-- DISCOVERY
--
-- Build 26 reciprocal age rules remain.
-- Build 27 adds:
--   viewer verified + entitled
--   candidate verified + entitled
-- ------------------------------------------------------------

drop function public.get_discovery_introductions(integer);

create function public.get_discovery_introductions(
  p_limit integer default 20
)
returns table (
  member_id uuid,
  first_name text,
  age integer,
  city text,
  relationship_intent text,
  lifestyle_signals text[],
  perfect_sunday text,
  green_flag text,
  chemistry_style text,
  compatibility_score integer,
  verified boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_member_age integer;
  v_minimum_age integer;
  v_maximum_age integer;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_limit is null
     or p_limit < 1
     or p_limit > 50 then
    raise exception
      'Discovery limit must be between 1 and 50.';
  end if;

  if not private.btme_member_can_date(v_member_id) then
    raise exception
      'Verified Premium membership is required for discovery.';
  end if;

  select
    extract(
      year from age(current_date, p.birth_date)
    )::integer,
    mp.minimum_age,
    mp.maximum_age
  into
    v_member_age,
    v_minimum_age,
    v_maximum_age
  from public.profiles p
  join public.member_preferences mp
    on mp.member_id = p.member_id
  where p.member_id = v_member_id;

  if v_member_age is null
     or v_minimum_age is null
     or v_maximum_age is null then
    raise exception
      'Complete your dating preferences before discovery.';
  end if;

  return query
  select
    candidate.id,
    cp.first_name,
    extract(
      year from age(current_date, cp.birth_date)
    )::integer,
    cp.city,
    candidate_preferences.relationship_intent,
    cmp.lifestyle_signals,
    cmp.perfect_sunday,
    cmp.green_flag,
    cmp.chemistry_style,
    private.btme_compatibility_score(
      v_member_id,
      candidate.id
    ),
    true
  from public.members candidate
  join public.profiles cp
    on cp.member_id = candidate.id
  join public.member_preferences candidate_preferences
    on candidate_preferences.member_id = candidate.id
  join public.compatibility_profiles cmp
    on cmp.member_id = candidate.id
  where candidate.id <> v_member_id

    and private.btme_member_can_date(candidate.id)

    and candidate_preferences.relationship_intent is not null

    and cardinality(candidate_preferences.looking_for) > 0

    and cardinality(cmp.lifestyle_signals) >= 2

    and extract(
      year from age(current_date, cp.birth_date)
    )::integer
      between v_minimum_age and v_maximum_age

    and v_member_age
      between candidate_preferences.minimum_age
      and candidate_preferences.maximum_age

    and not exists (
      select 1
      from public.member_decisions d
      where d.actor_id = v_member_id
        and d.target_id = candidate.id
    )

    and not exists (
      select 1
      from public.connections c
      where c.status = 'active'
        and (
          (
            c.member_one_id = v_member_id
            and c.member_two_id = candidate.id
          )
          or
          (
            c.member_one_id = candidate.id
            and c.member_two_id = v_member_id
          )
        )
    )

    and not exists (
      select 1
      from public.member_blocks b
      where
        (
          b.blocker_id = v_member_id
          and b.blocked_id = candidate.id
        )
        or
        (
          b.blocker_id = candidate.id
          and b.blocked_id = v_member_id
        )
    )

  order by
    private.btme_compatibility_score(
      v_member_id,
      candidate.id
    ) desc,
    candidate.created_at asc

  limit p_limit;
end;
$$;

revoke all
on function public.get_discovery_introductions(integer)
from public;

revoke all
on function public.get_discovery_introductions(integer)
from anon;

grant execute
on function public.get_discovery_introductions(integer)
to authenticated;

-- ------------------------------------------------------------
-- DECISION BYPASS PROTECTION
--
-- Preserve the already-tested matching transaction underneath
-- a new Build 27 eligibility boundary.
-- ------------------------------------------------------------

alter function public.record_member_decision(uuid, text)
rename to record_member_decision_unchecked;

revoke all
on function public.record_member_decision_unchecked(uuid, text)
from public;

revoke all
on function public.record_member_decision_unchecked(uuid, text)
from anon;

revoke all
on function public.record_member_decision_unchecked(uuid, text)
from authenticated;

create function public.record_member_decision(
  p_target_id uuid,
  p_decision text
)
returns table (
  matched boolean,
  connection_id uuid,
  conversation_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_target_id is null
     or p_target_id = v_member_id then
    raise exception 'Invalid target member.';
  end if;

  if p_decision not in ('like', 'pass') then
    raise exception 'Decision must be like or pass.';
  end if;

  if not private.btme_member_can_date(v_member_id) then
    raise exception
      'Verified Premium membership is required.';
  end if;

  if not private.btme_member_can_date(p_target_id) then
    raise exception
      'This member is not currently eligible for dating.';
  end if;

  if exists (
    select 1
    from public.member_blocks b
    where
      (
        b.blocker_id = v_member_id
        and b.blocked_id = p_target_id
      )
      or
      (
        b.blocker_id = p_target_id
        and b.blocked_id = v_member_id
      )
  ) then
    raise exception 'This member is not available.';
  end if;

  return query
  select *
  from public.record_member_decision_unchecked(
    p_target_id,
    p_decision
  );
end;
$$;

revoke all
on function public.record_member_decision(uuid, text)
from public;

revoke all
on function public.record_member_decision(uuid, text)
from anon;

grant execute
on function public.record_member_decision(uuid, text)
to authenticated;

-- ------------------------------------------------------------
-- REALTIME SPARK
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime
    add table public.messages;
  end if;
end;
$$;

commit;
