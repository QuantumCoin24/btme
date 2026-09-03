begin;

-- ============================================================
-- BTME™ MATCHMAKING ENGINE
--
-- Public client operations:
--   get_discovery_introductions()
--   record_member_decision(uuid, text)
--   get_member_connections()
--
-- Principles:
--   * server-authoritative eligibility
--   * no self discovery
--   * completed + active members only
--   * blocked pairs never surface
--   * already-decided profiles never resurface
--   * compatibility is pair-based, never popularity-based
--   * only mutual likes create a connection
--   * connection + conversation creation is atomic
-- ============================================================


-- ------------------------------------------------------------
-- 1. Pair compatibility
-- ------------------------------------------------------------

create or replace function private.btme_compatibility_score(
  p_member_one uuid,
  p_member_two uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with member_data as (
    select
      m.id,
      p.birth_date,
      mp.relationship_intent,
      mp.looking_for,
      mp.minimum_age,
      mp.maximum_age,
      cp.lifestyle_signals,
      cp.chemistry_style,
      cp.deal_breakers
    from public.members m
    join public.profiles p
      on p.member_id = m.id
    join public.member_preferences mp
      on mp.member_id = m.id
    join public.compatibility_profiles cp
      on cp.member_id = m.id
    where m.id in (p_member_one, p_member_two)
  ),
  pair as (
    select
      a.*,
      b.id as other_id,
      b.birth_date as other_birth_date,
      b.relationship_intent as other_relationship_intent,
      b.looking_for as other_looking_for,
      b.minimum_age as other_minimum_age,
      b.maximum_age as other_maximum_age,
      b.lifestyle_signals as other_lifestyle_signals,
      b.chemistry_style as other_chemistry_style,
      b.deal_breakers as other_deal_breakers
    from member_data a
    join member_data b
      on b.id <> a.id
    where a.id = p_member_one
      and b.id = p_member_two
  ),
  scored as (
    select
      -- Relationship intent: 30
      case
        when relationship_intent = other_relationship_intent then 30
        when relationship_intent in ('relationship', 'life-partner')
         and other_relationship_intent in ('relationship', 'life-partner')
          then 24
        when relationship_intent is not null
         and other_relationship_intent is not null
          then 12
        else 0
      end

      +

      -- Age compatibility: 20
      case
        when birth_date is not null
         and other_birth_date is not null
         and extract(year from age(current_date, other_birth_date))
               between minimum_age and maximum_age
         and extract(year from age(current_date, birth_date))
               between other_minimum_age and other_maximum_age
          then 20
        else 0
      end

      +

      -- Shared lifestyle: up to 25
      least(
        25,
        (
          select count(*) * 5
          from (
            select unnest(coalesce(lifestyle_signals, '{}'::text[]))
            intersect
            select unnest(coalesce(other_lifestyle_signals, '{}'::text[]))
          ) shared_lifestyle
        )
      )

      +

      -- Chemistry: 15
      case
        when chemistry_style is not null
         and chemistry_style = other_chemistry_style
          then 15
        when chemistry_style is not null
         and other_chemistry_style is not null
          then 7
        else 0
      end

      +

      -- Deal-breaker overlap: up to 10
      least(
        10,
        (
          select count(*) * 2
          from (
            select unnest(coalesce(deal_breakers, '{}'::text[]))
            intersect
            select unnest(coalesce(other_deal_breakers, '{}'::text[]))
          ) shared_deal_breakers
        )
      ) as score
    from pair
  )
  select greatest(0, least(100, coalesce(score, 0)))::integer
  from scored;
$$;


-- ------------------------------------------------------------
-- 2. Discovery introductions
--
-- Deliberately does NOT expose:
--   birth date
--   raw verification evidence
--   private media storage paths
--   email / phone
-- ------------------------------------------------------------

create or replace function public.get_discovery_introductions(
  p_limit integer default 20
)
returns table (
  member_id uuid,
  first_name text,
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
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  return query
  select
    candidate.id,
    candidate_profile.first_name,
    candidate_profile.city,
    candidate_preferences.relationship_intent,
    candidate_compatibility.lifestyle_signals,
    candidate_compatibility.perfect_sunday,
    candidate_compatibility.green_flag,
    candidate_compatibility.chemistry_style,

    private.btme_compatibility_score(
      v_member_id,
      candidate.id
    ),

    coalesce(candidate_verification.is_verified, false)

  from public.members candidate

  join public.profiles candidate_profile
    on candidate_profile.member_id = candidate.id

  join public.member_preferences candidate_preferences
    on candidate_preferences.member_id = candidate.id

  join public.compatibility_profiles candidate_compatibility
    on candidate_compatibility.member_id = candidate.id

  left join lateral (
    select
      exists (
        select 1
        from public.identity_verifications iv
        where iv.member_id = candidate.id
          and iv.status = 'verified'
      ) as is_verified
  ) candidate_verification
    on true

  where candidate.id <> v_member_id

    and candidate.account_status = 'active'

    and candidate_profile.profile_complete = true

    and candidate_profile.birth_date is not null

    and candidate_profile.birth_date
          <= (current_date - interval '18 years')::date

    and candidate_preferences.relationship_intent is not null

    and cardinality(candidate_preferences.looking_for) > 0

    and cardinality(candidate_compatibility.lifestyle_signals) >= 2

    -- Never resurface someone already decided upon.
    and not exists (
      select 1
      from public.member_decisions existing_decision
      where existing_decision.actor_id = v_member_id
        and existing_decision.target_id = candidate.id
    )

    -- Never surface an existing connection.
    and not exists (
      select 1
      from public.connections existing_connection
      where existing_connection.status = 'active'
        and (
          (
            existing_connection.member_one_id = v_member_id
            and existing_connection.member_two_id = candidate.id
          )
          or
          (
            existing_connection.member_one_id = candidate.id
            and existing_connection.member_two_id = v_member_id
          )
        )
    )

    -- Blocking is symmetric for discovery.
    and not exists (
      select 1
      from public.member_blocks block
      where
        (
          block.blocker_id = v_member_id
          and block.blocked_id = candidate.id
        )
        or
        (
          block.blocker_id = candidate.id
          and block.blocked_id = v_member_id
        )
    )

  order by
    private.btme_compatibility_score(
      v_member_id,
      candidate.id
    ) desc,
    candidate.id

  limit v_limit;
end;
$$;


-- ------------------------------------------------------------
-- 3. Record a member decision.
--
-- Mutual like:
--   decision
--      ↓
--   canonical connection
--      ↓
--   conversation
--      ↓
--   exactly two conversation members
--
-- All inside the caller's transaction.
-- ------------------------------------------------------------

create or replace function public.record_member_decision(
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
  v_member_one uuid;
  v_member_two uuid;
  v_connection_id uuid;
  v_conversation_id uuid;
  v_mutual_like boolean := false;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_target_id is null then
    raise exception 'Target member is required.';
  end if;

  if p_target_id = v_member_id then
    raise exception 'Members cannot decide on themselves.';
  end if;

  if p_decision not in ('like', 'pass') then
    raise exception 'Decision must be like or pass.';
  end if;

  if not exists (
    select 1
    from public.members target_member
    join public.profiles target_profile
      on target_profile.member_id = target_member.id
    where target_member.id = p_target_id
      and target_member.account_status = 'active'
      and target_profile.profile_complete = true
      and target_profile.birth_date is not null
      and target_profile.birth_date
            <= (current_date - interval '18 years')::date
  ) then
    raise exception 'Target member is not eligible.';
  end if;

  if exists (
    select 1
    from public.member_blocks block
    where
      (
        block.blocker_id = v_member_id
        and block.blocked_id = p_target_id
      )
      or
      (
        block.blocker_id = p_target_id
        and block.blocked_id = v_member_id
      )
  ) then
    raise exception 'Decision cannot be recorded for this member.';
  end if;

  insert into public.member_decisions (
    actor_id,
    target_id,
    decision
  )
  values (
    v_member_id,
    p_target_id,
    p_decision
  );

  if p_decision = 'like' then
    select exists (
      select 1
      from public.member_decisions reverse_decision
      where reverse_decision.actor_id = p_target_id
        and reverse_decision.target_id = v_member_id
        and reverse_decision.decision = 'like'
    )
    into v_mutual_like;
  end if;

  if not v_mutual_like then
    return query
    select
      false,
      null::uuid,
      null::uuid;

    return;
  end if;

  v_member_one := least(v_member_id, p_target_id);
  v_member_two := greatest(v_member_id, p_target_id);

  insert into public.connections (
    member_one_id,
    member_two_id,
    status
  )
  values (
    v_member_one,
    v_member_two,
    'active'
  )
  on conflict (member_one_id, member_two_id)
  do update
    set status = 'active',
        ended_at = null,
        updated_at = now()
  returning id
  into v_connection_id;

  insert into public.conversations (
    connection_id
  )
  values (
    v_connection_id
  )
  on conflict (connection_id)
  do nothing;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.connection_id = v_connection_id;

  insert into public.conversation_members (
    conversation_id,
    member_id
  )
  values
    (v_conversation_id, v_member_one),
    (v_conversation_id, v_member_two)
  on conflict (conversation_id, member_id)
  do nothing;

  return query
  select
    true,
    v_connection_id,
    v_conversation_id;
end;
$$;


-- ------------------------------------------------------------
-- 4. Member connection projection
-- ------------------------------------------------------------

create or replace function public.get_member_connections()
returns table (
  connection_id uuid,
  conversation_id uuid,
  member_id uuid,
  first_name text,
  city text,
  connected_at timestamptz,
  verified boolean
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
    c.id,
    conversation.id,
    other_member.id,
    other_profile.first_name,
    other_profile.city,
    c.connected_at,

    exists (
      select 1
      from public.identity_verifications iv
      where iv.member_id = other_member.id
        and iv.status = 'verified'
    )

  from public.connections c

  join public.members other_member
    on other_member.id = case
      when c.member_one_id = v_member_id
        then c.member_two_id
      else c.member_one_id
    end

  join public.profiles other_profile
    on other_profile.member_id = other_member.id

  left join public.conversations conversation
    on conversation.connection_id = c.id

  where c.status = 'active'
    and (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
    )

  order by c.connected_at desc;
end;
$$;


-- ------------------------------------------------------------
-- 5. Function privilege boundary
-- ------------------------------------------------------------

revoke all on function private.btme_compatibility_score(uuid, uuid)
from public;

revoke all on function private.btme_compatibility_score(uuid, uuid)
from anon;

revoke all on function private.btme_compatibility_score(uuid, uuid)
from authenticated;


revoke all on function public.get_discovery_introductions(integer)
from public;

revoke all on function public.get_discovery_introductions(integer)
from anon;

grant execute on function public.get_discovery_introductions(integer)
to authenticated;


revoke all on function public.record_member_decision(uuid, text)
from public;

revoke all on function public.record_member_decision(uuid, text)
from anon;

grant execute on function public.record_member_decision(uuid, text)
to authenticated;


revoke all on function public.get_member_connections()
from public;

revoke all on function public.get_member_connections()
from anon;

grant execute on function public.get_member_connections()
to authenticated;

commit;
