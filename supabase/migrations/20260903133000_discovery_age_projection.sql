begin;

-- ============================================================
-- BTME™ AUTHORITATIVE AGE PROJECTION
--
-- Public dating projections may expose current integer age.
-- Birth date itself remains private.
--
-- Extends:
--   get_discovery_introductions(integer)
--   get_member_connections()
-- ============================================================

-- ------------------------------------------------------------
-- 1. Discovery introductions
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
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
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
          <= (
            current_date - interval '18 years'
          )::date

    and candidate_preferences.relationship_intent
          is not null

    and cardinality(
          candidate_preferences.looking_for
        ) > 0

    and cardinality(
          candidate_compatibility.lifestyle_signals
        ) >= 2

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
            existing_connection.member_one_id =
              v_member_id
            and existing_connection.member_two_id =
              candidate.id
          )
          or
          (
            existing_connection.member_one_id =
              candidate.id
            and existing_connection.member_two_id =
              v_member_id
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
-- 2. Member connections
-- ------------------------------------------------------------

drop function if exists public.get_member_connections();

create function public.get_member_connections()
returns table (
  connection_id uuid,
  conversation_id uuid,
  member_id uuid,
  first_name text,
  age integer,
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

    extract(
      year from age(
        current_date,
        other_profile.birth_date
      )
    )::integer,

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

    and other_member.account_status = 'active'

    and other_profile.profile_complete = true

    and other_profile.birth_date is not null

    and other_profile.birth_date
          <= (
            current_date - interval '18 years'
          )::date

  order by c.connected_at desc;
end;
$$;

revoke all
on function public.get_member_connections()
from public;

revoke all
on function public.get_member_connections()
from anon;

grant execute
on function public.get_member_connections()
to authenticated;

commit;
