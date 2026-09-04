begin;

create table public.safe_date_member_states (
  safe_date_session_id uuid not null
    references public.safe_date_sessions(id) on delete cascade,

  member_id uuid not null
    references public.members(id) on delete cascade,

  check_in_interval_minutes integer
    check (
      check_in_interval_minutes is null
      or check_in_interval_minutes between 5 and 240
    ),

  next_check_in_at timestamptz,
  last_check_in_at timestamptz,

  safe_arrival_confirmed_at timestamptz,

  assistance_requested_at timestamptz,
  assistance_cleared_at timestamptz,

  trusted_contact_enabled boolean not null default false,

  location_sharing_enabled boolean not null default false,
  location_sharing_expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (safe_date_session_id, member_id)
);

create index safe_date_member_states_member_idx
on public.safe_date_member_states(member_id);

create trigger safe_date_member_states_set_updated_at
before update on public.safe_date_member_states
for each row
execute function private.set_updated_at();

alter table public.safe_date_member_states enable row level security;

revoke all on table public.safe_date_member_states
from public, anon, authenticated;

create or replace function private.assert_safe_date_participant(
  p_date_plan_id uuid,
  p_member_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  select s.id
  into v_session_id
  from public.safe_date_sessions s
  join public.date_plans dp
    on dp.id = s.date_plan_id
  join public.connections c
    on c.id = dp.connection_id
  where dp.id = p_date_plan_id
    and (
      c.member_one_id = p_member_id
      or c.member_two_id = p_member_id
    );

  if v_session_id is null then
    raise exception 'Active SafeDate participant not found.';
  end if;

  return v_session_id;
end;
$$;

revoke all on function private.assert_safe_date_participant(uuid, uuid)
from public, anon, authenticated;

create or replace function public.get_my_safe_date_protection(
  p_date_plan_id uuid
)
returns table (
  safe_date_session_id uuid,
  check_in_interval_minutes integer,
  next_check_in_at timestamptz,
  last_check_in_at timestamptz,
  safe_arrival_confirmed_at timestamptz,
  assistance_requested_at timestamptz,
  trusted_contact_enabled boolean,
  location_sharing_enabled boolean,
  location_sharing_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id
  )
  values (
    v_session_id,
    v_member_id
  )
  on conflict (safe_date_session_id, member_id)
  do nothing;

  return query
  select
    ms.safe_date_session_id,
    ms.check_in_interval_minutes,
    ms.next_check_in_at,
    ms.last_check_in_at,
    ms.safe_arrival_confirmed_at,
    case
      when ms.assistance_requested_at is not null
       and (
         ms.assistance_cleared_at is null
         or ms.assistance_requested_at > ms.assistance_cleared_at
       )
        then ms.assistance_requested_at
      else null
    end,
    ms.trusted_contact_enabled,
    ms.location_sharing_enabled,
    ms.location_sharing_expires_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;
end;
$$;

revoke all on function public.get_my_safe_date_protection(uuid)
from public, anon;

grant execute on function public.get_my_safe_date_protection(uuid)
to authenticated;

create or replace function public.configure_my_safe_date_check_in(
  p_date_plan_id uuid,
  p_interval_minutes integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_interval_minutes is not null
     and (
       p_interval_minutes < 5
       or p_interval_minutes > 240
     ) then
    raise exception 'Check-in interval must be between 5 and 240 minutes.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    check_in_interval_minutes,
    next_check_in_at
  )
  values (
    v_session_id,
    v_member_id,
    p_interval_minutes,
    case
      when p_interval_minutes is null then null
      else now() + make_interval(mins => p_interval_minutes)
    end
  )
  on conflict (safe_date_session_id, member_id)
  do update set
    check_in_interval_minutes = excluded.check_in_interval_minutes,
    next_check_in_at = excluded.next_check_in_at;
end;
$$;

revoke all on function public.configure_my_safe_date_check_in(uuid, integer)
from public, anon;

grant execute on function public.configure_my_safe_date_check_in(uuid, integer)
to authenticated;

create or replace function public.check_in_my_safe_date(
  p_date_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
  v_interval integer;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select ms.check_in_interval_minutes
  into v_interval
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    last_check_in_at
  )
  values (
    v_session_id,
    v_member_id,
    now()
  )
  on conflict (safe_date_session_id, member_id)
  do update set
    last_check_in_at = now(),
    next_check_in_at =
      case
        when v_interval is null then null
        else now() + make_interval(mins => v_interval)
      end;
end;
$$;

revoke all on function public.check_in_my_safe_date(uuid)
from public, anon;

grant execute on function public.check_in_my_safe_date(uuid)
to authenticated;

create or replace function public.request_my_safe_date_assistance(
  p_date_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    assistance_requested_at,
    assistance_cleared_at
  )
  values (
    v_session_id,
    v_member_id,
    now(),
    null
  )
  on conflict (safe_date_session_id, member_id)
  do update set
    assistance_requested_at = now(),
    assistance_cleared_at = null;
end;
$$;

revoke all on function public.request_my_safe_date_assistance(uuid)
from public, anon;

grant execute on function public.request_my_safe_date_assistance(uuid)
to authenticated;

create or replace function public.clear_my_safe_date_assistance(
  p_date_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  update public.safe_date_member_states
  set assistance_cleared_at = now()
  where safe_date_session_id = v_session_id
    and member_id = v_member_id;
end;
$$;

revoke all on function public.clear_my_safe_date_assistance(uuid)
from public, anon;

grant execute on function public.clear_my_safe_date_assistance(uuid)
to authenticated;

create or replace function public.confirm_my_safe_arrival(
  p_date_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    safe_arrival_confirmed_at
  )
  values (
    v_session_id,
    v_member_id,
    now()
  )
  on conflict (safe_date_session_id, member_id)
  do update set
    safe_arrival_confirmed_at =
      coalesce(
        public.safe_date_member_states.safe_arrival_confirmed_at,
        now()
      );
end;
$$;

revoke all on function public.confirm_my_safe_arrival(uuid)
from public, anon;

grant execute on function public.confirm_my_safe_arrival(uuid)
to authenticated;

create or replace function public.set_my_safe_date_location_consent(
  p_date_plan_id uuid,
  p_enabled boolean,
  p_duration_minutes integer default 120
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_enabled
     and (
       p_duration_minutes is null
       or p_duration_minutes < 15
       or p_duration_minutes > 480
     ) then
    raise exception 'Location sharing duration must be between 15 and 480 minutes.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    location_sharing_enabled,
    location_sharing_expires_at
  )
  values (
    v_session_id,
    v_member_id,
    p_enabled,
    case
      when p_enabled
        then now() + make_interval(mins => p_duration_minutes)
      else null
    end
  )
  on conflict (safe_date_session_id, member_id)
  do update set
    location_sharing_enabled = excluded.location_sharing_enabled,
    location_sharing_expires_at = excluded.location_sharing_expires_at;
end;
$$;

revoke all on function public.set_my_safe_date_location_consent(
  uuid,
  boolean,
  integer
)
from public, anon;

grant execute on function public.set_my_safe_date_location_consent(
  uuid,
  boolean,
  integer
)
to authenticated;

commit;
