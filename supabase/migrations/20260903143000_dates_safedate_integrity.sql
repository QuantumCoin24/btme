begin;

-- ============================================================
-- BUILD 25
-- Production Dates + SafeDate + integrity hardening
-- ============================================================


-- ------------------------------------------------------------
-- 1. SafeDate production state
--
-- One session belongs to one date plan.
-- Each participant controls only their own SafeDate side.
-- The shared session is considered closed only after BOTH
-- participants independently end their own side.
-- ------------------------------------------------------------

create table public.safe_date_sessions (
  id uuid primary key default gen_random_uuid(),

  date_plan_id uuid not null unique
    references public.date_plans(id) on delete cascade,

  started_by uuid not null
    references public.members(id) on delete cascade,

  started_at timestamptz not null default now(),

  member_one_ended_at timestamptz,
  member_two_ended_at timestamptz,

  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index safe_date_sessions_date_plan_id_idx
  on public.safe_date_sessions(date_plan_id);

create index safe_date_sessions_started_by_idx
  on public.safe_date_sessions(started_by);


create trigger safe_date_sessions_set_updated_at
before update on public.safe_date_sessions
for each row
execute function private.set_updated_at();


alter table public.safe_date_sessions enable row level security;

revoke all on table public.safe_date_sessions from anon;
revoke all on table public.safe_date_sessions from authenticated;

grant select
on table public.safe_date_sessions
to authenticated;


create policy safe_date_sessions_select_participant
on public.safe_date_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.date_plans dp
    join public.connections c
      on c.id = dp.connection_id
    where dp.id = safe_date_sessions.date_plan_id
      and (
        c.member_one_id = (select auth.uid())
        or c.member_two_id = (select auth.uid())
      )
  )
);


-- ------------------------------------------------------------
-- 2. Date plan projection
--
-- Server-authoritative date loading.
-- Both members of an active connection may see the date.
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
  where c.status = 'active'
    and (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
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


-- ------------------------------------------------------------
-- 3. Create a production date plan
--
-- The server derives created_by from auth.uid().
-- A client cannot create a date for somebody else's connection.
-- ------------------------------------------------------------

create or replace function public.create_member_date_plan(
  p_connection_id uuid,
  p_scheduled_for timestamptz,
  p_place_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_date_plan_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_connection_id is null then
    raise exception 'Connection is required.';
  end if;

  if p_scheduled_for is null then
    raise exception 'Date and time are required.';
  end if;

  if p_place_name is null
     or char_length(btrim(p_place_name)) < 1
     or char_length(btrim(p_place_name)) > 250 then
    raise exception 'Date place is invalid.';
  end if;

  if not exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and c.status = 'active'
      and (
        c.member_one_id = v_member_id
        or c.member_two_id = v_member_id
      )
  ) then
    raise exception 'Active connection not found.';
  end if;

  insert into public.date_plans (
    connection_id,
    created_by,
    scheduled_for,
    place_name,
    status
  )
  values (
    p_connection_id,
    v_member_id,
    p_scheduled_for,
    btrim(p_place_name),
    'proposed'
  )
  returning id into v_date_plan_id;

  return v_date_plan_id;
end;
$$;


revoke all on function public.create_member_date_plan(
  uuid,
  timestamptz,
  text
)
from public;

revoke all on function public.create_member_date_plan(
  uuid,
  timestamptz,
  text
)
from anon;

grant execute on function public.create_member_date_plan(
  uuid,
  timestamptz,
  text
)
to authenticated;


-- ------------------------------------------------------------
-- 4. SafeDate projection
--
-- The returned "my" and "their" state is calculated according
-- to the authenticated participant. The client never decides
-- which connection side it owns.
-- ------------------------------------------------------------

create or replace function public.get_safe_date_session(
  p_date_plan_id uuid
)
returns table (
  session_id uuid,
  date_plan_id uuid,
  started_at timestamptz,
  my_ended_at timestamptz,
  their_ended_at timestamptz,
  closed_at timestamptz
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
    s.id,
    s.date_plan_id,
    s.started_at,

    case
      when c.member_one_id = v_member_id
        then s.member_one_ended_at
      else s.member_two_ended_at
    end,

    case
      when c.member_one_id = v_member_id
        then s.member_two_ended_at
      else s.member_one_ended_at
    end,

    s.closed_at

  from public.safe_date_sessions s
  join public.date_plans dp
    on dp.id = s.date_plan_id
  join public.connections c
    on c.id = dp.connection_id

  where s.date_plan_id = p_date_plan_id
    and (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
    );
end;
$$;


revoke all on function public.get_safe_date_session(uuid)
from public;

revoke all on function public.get_safe_date_session(uuid)
from anon;

grant execute on function public.get_safe_date_session(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 5. Start SafeDate
--
-- Either participant may activate protection.
-- Repeated calls are idempotent: one date has one session.
-- ------------------------------------------------------------

create or replace function public.start_safe_date(
  p_date_plan_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_connection_id uuid;
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  select dp.connection_id
  into v_connection_id
  from public.date_plans dp
  join public.connections c
    on c.id = dp.connection_id
  where dp.id = p_date_plan_id
    and c.status = 'active'
    and dp.status <> 'cancelled'
    and (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
    );

  if v_connection_id is null then
    raise exception 'Eligible date plan not found.';
  end if;

  insert into public.safe_date_sessions (
    date_plan_id,
    started_by
  )
  values (
    p_date_plan_id,
    v_member_id
  )
  on conflict (date_plan_id)
  do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select s.id
    into v_session_id
    from public.safe_date_sessions s
    where s.date_plan_id = p_date_plan_id;
  end if;

  return v_session_id;
end;
$$;


revoke all on function public.start_safe_date(uuid)
from public;

revoke all on function public.start_safe_date(uuid)
from anon;

grant execute on function public.start_safe_date(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 6. End MY SafeDate side
--
-- Critical invariant:
-- one participant can end only their own side.
--
-- closed_at is written only once BOTH sides have independently
-- ended.
-- ------------------------------------------------------------

create or replace function public.end_my_safe_date(
  p_date_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_member_one_id uuid;
  v_member_two_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  select
    c.member_one_id,
    c.member_two_id
  into
    v_member_one_id,
    v_member_two_id
  from public.date_plans dp
  join public.connections c
    on c.id = dp.connection_id
  where dp.id = p_date_plan_id
    and (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
    );

  if v_member_one_id is null then
    raise exception 'Date plan not found.';
  end if;

  if not exists (
    select 1
    from public.safe_date_sessions s
    where s.date_plan_id = p_date_plan_id
  ) then
    raise exception 'SafeDate is not active.';
  end if;

  if v_member_id = v_member_one_id then
    update public.safe_date_sessions
    set member_one_ended_at =
      coalesce(member_one_ended_at, now())
    where date_plan_id = p_date_plan_id;
  elsif v_member_id = v_member_two_id then
    update public.safe_date_sessions
    set member_two_ended_at =
      coalesce(member_two_ended_at, now())
    where date_plan_id = p_date_plan_id;
  else
    raise exception 'SafeDate participant not found.';
  end if;

  update public.safe_date_sessions
  set closed_at = coalesce(closed_at, now())
  where date_plan_id = p_date_plan_id
    and member_one_ended_at is not null
    and member_two_ended_at is not null;
end;
$$;


revoke all on function public.end_my_safe_date(uuid)
from public;

revoke all on function public.end_my_safe_date(uuid)
from anon;

grant execute on function public.end_my_safe_date(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 7. Matchmaking authority hardening
--
-- Decisions are written through record_member_decision().
-- Remove direct authenticated mutation authority.
-- Existing self-read access remains.
-- ------------------------------------------------------------

revoke insert, update
on table public.member_decisions
from authenticated;


-- ------------------------------------------------------------
-- 8. Prevent silent resurrection of ended connections
--
-- The current record_member_decision implementation may update
-- an existing pair back to active. Enforce the invariant at the
-- table boundary as a defence-in-depth guard.
-- ------------------------------------------------------------

create or replace function private.prevent_connection_reactivation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status <> 'active'
     and new.status = 'active' then
    raise exception 'Ended connections cannot be reactivated implicitly.';
  end if;

  return new;
end;
$$;


create trigger connections_prevent_implicit_reactivation
before update of status
on public.connections
for each row
execute function private.prevent_connection_reactivation();


-- ------------------------------------------------------------
-- 9. Completed onboarding guard
--
-- Defence in depth: once profile_complete is true, the
-- transactional onboarding RPC must not be allowed to rewrite
-- the member's completed profile.
--
-- This trigger protects the completed profile from a transition
-- that attempts to alter protected onboarding identity fields
-- while profile_complete remains true.
-- ------------------------------------------------------------

create or replace function private.protect_completed_profile_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.profile_complete = true
     and new.profile_complete = true
     and (
       new.birth_date is distinct from old.birth_date
     ) then
    raise exception 'Completed onboarding cannot rewrite birth date.';
  end if;

  return new;
end;
$$;


create trigger profiles_protect_completed_identity
before update
on public.profiles
for each row
execute function private.protect_completed_profile_identity();


-- profile_complete itself is workflow state and must no longer
-- be directly mutable by the authenticated client role.

revoke update
on table public.profiles
from authenticated;

grant update (
  first_name,
  birth_date,
  city,
  bio
)
on table public.profiles
to authenticated;


commit;
