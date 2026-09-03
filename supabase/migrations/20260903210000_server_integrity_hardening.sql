begin;

-- ============================================================
-- BTME™ BUILD 26 — SERVER INTEGRITY HARDENING
--
-- 1. Completed onboarding is one-way at the RPC boundary.
-- 2. Discovery requires reciprocal age eligibility.
-- 3. Spark writes require an active connection.
-- 4. Open SafeDate sessions remain reachable after a connection
--    ends so each participant retains independent end control.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Completed onboarding RPC boundary
-- ------------------------------------------------------------

create or replace function public.complete_member_onboarding(
  p_first_name text,
  p_birth_date date,
  p_city text,
  p_relationship_intent text,
  p_looking_for text[],
  p_minimum_age integer,
  p_maximum_age integer,
  p_distance_km integer,
  p_lifestyle_signals text[],
  p_perfect_sunday text,
  p_green_flag text,
  p_absolute_no text,
  p_chemistry_style text,
  p_deal_breakers text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_profile_complete boolean;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  select p.profile_complete
  into v_profile_complete
  from public.profiles p
  where p.member_id = v_member_id;

  if not found then
    raise exception 'Member profile bootstrap is missing.';
  end if;

  if v_profile_complete = true then
    raise exception 'Member onboarding is already complete.';
  end if;

  if p_first_name is null
     or char_length(btrim(p_first_name)) < 2 then
    raise exception 'First name is incomplete.';
  end if;

  if p_birth_date is null
     or p_birth_date > (current_date - interval '18 years')::date then
    raise exception 'Member must be at least 18.';
  end if;

  if p_city is null
     or char_length(btrim(p_city)) < 2 then
    raise exception 'Dating location is incomplete.';
  end if;

  if p_relationship_intent is null
     or char_length(btrim(p_relationship_intent)) < 2 then
    raise exception 'Relationship intent is incomplete.';
  end if;

  if coalesce(cardinality(p_looking_for), 0) < 1
     or exists (
       select 1
       from unnest(p_looking_for) as value
       where char_length(btrim(coalesce(value, ''))) < 1
     ) then
    raise exception 'Match preference is incomplete.';
  end if;

  if p_minimum_age is null
     or p_maximum_age is null
     or p_minimum_age < 18
     or p_maximum_age < p_minimum_age then
    raise exception 'Age preference is invalid.';
  end if;

  if p_distance_km is null
     or p_distance_km <= 0 then
    raise exception 'Dating distance is invalid.';
  end if;

  if coalesce(cardinality(p_lifestyle_signals), 0) < 2
     or exists (
       select 1
       from unnest(p_lifestyle_signals) as value
       where char_length(btrim(coalesce(value, ''))) < 1
     ) then
    raise exception 'Lifestyle profile is incomplete.';
  end if;

  if p_perfect_sunday is null
     or char_length(btrim(p_perfect_sunday)) < 10 then
    raise exception 'Perfect Sunday answer is incomplete.';
  end if;

  if p_green_flag is null
     or char_length(btrim(p_green_flag)) < 6 then
    raise exception 'Green flag answer is incomplete.';
  end if;

  if p_absolute_no is null
     or char_length(btrim(p_absolute_no)) < 6 then
    raise exception 'Absolutely not answer is incomplete.';
  end if;

  if p_chemistry_style is null
     or char_length(btrim(p_chemistry_style)) < 1 then
    raise exception 'Chemistry style is incomplete.';
  end if;

  if p_deal_breakers is null then
    raise exception 'Deal breakers must be supplied.';
  end if;

  update public.profiles
  set
    first_name = btrim(p_first_name),
    birth_date = p_birth_date,
    city = btrim(p_city)
  where member_id = v_member_id
    and profile_complete = false;

  if not found then
    raise exception 'Member onboarding is no longer available.';
  end if;

  update public.member_preferences
  set
    relationship_intent = p_relationship_intent,
    looking_for = p_looking_for,
    minimum_age = p_minimum_age,
    maximum_age = p_maximum_age,
    distance_km = p_distance_km
  where member_id = v_member_id;

  if not found then
    raise exception 'Member preferences bootstrap is missing.';
  end if;

  update public.compatibility_profiles
  set
    lifestyle_signals = p_lifestyle_signals,
    perfect_sunday = btrim(p_perfect_sunday),
    green_flag = btrim(p_green_flag),
    absolute_no = btrim(p_absolute_no),
    chemistry_style = p_chemistry_style,
    deal_breakers = p_deal_breakers
  where member_id = v_member_id;

  if not found then
    raise exception 'Compatibility bootstrap is missing.';
  end if;

  update public.profiles
  set profile_complete = true
  where member_id = v_member_id
    and profile_complete = false;

  if not found then
    raise exception 'Member profile completion failed.';
  end if;
end;
$$;

revoke all on function public.complete_member_onboarding(
  text,
  date,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  text[],
  text,
  text,
  text,
  text,
  text[]
) from public;

revoke all on function public.complete_member_onboarding(
  text,
  date,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  text[],
  text,
  text,
  text,
  text,
  text[]
) from anon;

grant execute on function public.complete_member_onboarding(
  text,
  date,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  text[],
  text,
  text,
  text,
  text,
  text[]
) to authenticated;


-- ------------------------------------------------------------
-- 2. Reciprocal discovery age eligibility
--
-- Candidate age must satisfy the viewer's age range AND
-- viewer age must satisfy the candidate's age range.
-- ------------------------------------------------------------

drop function if exists public.get_discovery_introductions(integer);

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
  v_limit integer :=
    least(greatest(coalesce(p_limit, 20), 1), 50);
  v_member_age integer;
  v_minimum_age integer;
  v_maximum_age integer;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
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
  where p.member_id = v_member_id
    and p.profile_complete = true
    and p.birth_date is not null;

  if not found
     or v_member_age is null
     or v_minimum_age is null
     or v_maximum_age is null then
    raise exception 'Completed dating preferences are required.';
  end if;

  return query
  select
    candidate.id,
    candidate_profile.first_name,
    extract(
      year from age(
        current_date,
        candidate_profile.birth_date
      )
    )::integer,
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
    exists (
      select 1
      from public.identity_verifications iv
      where iv.member_id = candidate.id
        and iv.status = 'verified'
    )
  from public.members candidate
  join public.profiles candidate_profile
    on candidate_profile.member_id = candidate.id
  join public.member_preferences candidate_preferences
    on candidate_preferences.member_id = candidate.id
  join public.compatibility_profiles candidate_compatibility
    on candidate_compatibility.member_id = candidate.id
  where candidate.id <> v_member_id
    and candidate.account_status = 'active'
    and candidate_profile.profile_complete = true
    and candidate_profile.birth_date is not null
    and candidate_profile.birth_date
        <= (current_date - interval '18 years')::date
    and candidate_preferences.relationship_intent is not null
    and cardinality(candidate_preferences.looking_for) > 0
    and cardinality(candidate_compatibility.lifestyle_signals) >= 2

    -- Viewer accepts candidate's current age.
    and extract(
      year from age(
        current_date,
        candidate_profile.birth_date
      )
    )::integer
      between v_minimum_age and v_maximum_age

    -- Candidate accepts viewer's current age.
    and v_member_age
      between candidate_preferences.minimum_age
          and candidate_preferences.maximum_age

    and not exists (
      select 1
      from public.member_decisions existing_decision
      where existing_decision.actor_id = v_member_id
        and existing_decision.target_id = candidate.id
    )
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
-- 3. Spark write lifecycle
--
-- Conversation membership alone is not sufficient authority to
-- send. The conversation's connection must still be active.
-- ------------------------------------------------------------

create or replace function private.is_active_conversation_member(
  p_conversation_id uuid,
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
    from public.conversation_members cm
    join public.conversations conversation
      on conversation.id = cm.conversation_id
    join public.connections connection
      on connection.id = conversation.connection_id
    where cm.conversation_id = p_conversation_id
      and cm.member_id = p_member_id
      and connection.status = 'active'
  );
$$;

revoke all
on function private.is_active_conversation_member(uuid, uuid)
from public, anon, authenticated;

drop policy if exists messages_insert_participant
on public.messages;

create policy messages_insert_active_participant
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_active_conversation_member(
    conversation_id,
    (select auth.uid())
  )
);


-- ------------------------------------------------------------
-- 4. SafeDate continuity
--
-- Normal date plans remain limited to active connections.
-- Exception: if a SafeDate session is OPEN, either original
-- participant retains access to that plan after the connection
-- ends. This preserves independent safety-side termination.
-- ------------------------------------------------------------

create or replace function public.get_member_date_plans()
returns table (
  date_plan_id uuid,
  connection_id uuid,
  created_by uuid,
  scheduled_for timestamptz,
  place_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
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
    dp.id,
    dp.connection_id,
    dp.created_by,
    dp.scheduled_for,
    dp.place_name,
    dp.status,
    dp.created_at,
    dp.updated_at
  from public.date_plans dp
  join public.connections c
    on c.id = dp.connection_id
  where
    (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
    )
    and (
      c.status = 'active'
      or exists (
        select 1
        from public.safe_date_sessions s
        where s.date_plan_id = dp.id
          and s.closed_at is null
      )
    )
  order by dp.scheduled_for asc, dp.created_at desc;
end;
$$;

revoke all on function public.get_member_date_plans()
from public;

revoke all on function public.get_member_date_plans()
from anon;

grant execute on function public.get_member_date_plans()
to authenticated;

commit;
