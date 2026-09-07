-- SafeDate Intelligence Core
-- Server-authoritative audit ledger, protection-state projection,
-- and precise-location retention authority.

create table public.safe_date_safety_events (
  id uuid primary key default gen_random_uuid(),
  safe_date_session_id uuid not null
    references public.safe_date_sessions(id) on delete cascade,
  member_id uuid
    references public.members(id) on delete cascade,
  event_type text not null,
  event_key text,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),

  constraint safe_date_safety_events_type_check
    check (
      event_type in (
        'session_started',
        'member_ended',
        'session_closed',
        'check_in_configured',
        'check_in_completed',
        'check_in_due',
        'check_in_missed',
        'check_in_recovered',
        'location_enabled',
        'location_disabled',
        'location_recorded',
        'location_expired',
        'assistance_requested',
        'assistance_cleared',
        'safe_arrival_confirmed',
        'protection_state_changed'
      )
    ),

  constraint safe_date_safety_events_data_object_check
    check (jsonb_typeof(event_data) = 'object'),

  constraint safe_date_safety_events_no_coordinates_check
    check (
      not (event_data ? 'latitude')
      and not (event_data ? 'longitude')
      and not (event_data ? 'coordinates')
      and not (event_data ? 'location')
    )
);

create index safe_date_safety_events_session_time_idx
on public.safe_date_safety_events (
  safe_date_session_id,
  occurred_at desc
);

create index safe_date_safety_events_member_time_idx
on public.safe_date_safety_events (
  member_id,
  occurred_at desc
)
where member_id is not null;

create unique index safe_date_safety_events_event_key_uidx
on public.safe_date_safety_events(event_key)
where event_key is not null;

alter table public.safe_date_safety_events
enable row level security;

revoke all
on table public.safe_date_safety_events
from public, anon, authenticated;


create or replace function private.record_safe_date_safety_event(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_event_type text,
  p_event_key text default null,
  p_event_data jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_data jsonb := coalesce(p_event_data, '{}'::jsonb);
begin
  if p_safe_date_session_id is null then
    raise exception 'SafeDate session is required.';
  end if;

  if p_event_type is null or btrim(p_event_type) = '' then
    raise exception 'SafeDate event type is required.';
  end if;

  if jsonb_typeof(v_data) <> 'object' then
    raise exception 'SafeDate event data must be a JSON object.';
  end if;

  if
    v_data ? 'latitude'
    or v_data ? 'longitude'
    or v_data ? 'coordinates'
    or v_data ? 'location'
  then
    raise exception 'Precise location data cannot be written to the SafeDate safety ledger.';
  end if;

  insert into public.safe_date_safety_events (
    safe_date_session_id,
    member_id,
    event_type,
    event_key,
    event_data,
    occurred_at
  )
  values (
    p_safe_date_session_id,
    p_member_id,
    p_event_type,
    nullif(btrim(p_event_key), ''),
    v_data,
    coalesce(p_occurred_at, now())
  )
  on conflict (event_key)
    where event_key is not null
  do update
    set event_key = excluded.event_key
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all
on function private.record_safe_date_safety_event(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  timestamptz
)
from public, anon, authenticated;


create or replace function private.safe_date_member_protection_state(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_now timestamptz default now()
)
returns text
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_session public.safe_date_sessions%rowtype;
  v_state public.safe_date_member_states%rowtype;
  v_member_one uuid;
  v_member_two uuid;
begin
  select s.*
  into v_session
  from public.safe_date_sessions s
  where s.id = p_safe_date_session_id;

  if not found then
    raise exception 'SafeDate session not found.';
  end if;

  select
    dp.member_one_id,
    dp.member_two_id
  into
    v_member_one,
    v_member_two
  from public.date_plans dp
  where dp.id = v_session.date_plan_id;

  if p_member_id <> v_member_one
     and p_member_id <> v_member_two then
    raise exception 'Member is not a participant in this SafeDate.';
  end if;

  if v_session.closed_at is not null then
    return 'safe_date_closed';
  end if;

  if (
    p_member_id = v_member_one
    and v_session.member_one_ended_at is not null
  ) or (
    p_member_id = v_member_two
    and v_session.member_two_ended_at is not null
  ) then
    return 'member_protection_ended';
  end if;

  select ms.*
  into v_state
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = p_safe_date_session_id
    and ms.member_id = p_member_id;

  if not found then
    return 'normal';
  end if;

  if v_state.safe_arrival_confirmed_at is not null then
    return 'safe_arrival_confirmed';
  end if;

  if
    v_state.assistance_requested_at is not null
    and (
      v_state.assistance_cleared_at is null
      or v_state.assistance_cleared_at
         < v_state.assistance_requested_at
    )
  then
    return 'assistance_requested';
  end if;

  if
    v_state.check_in_interval_minutes is not null
    and v_state.next_check_in_at is not null
    and v_state.next_check_in_at <= p_now
  then
    return 'check_in_overdue';
  end if;

  if
    v_state.check_in_interval_minutes is not null
    and v_state.next_check_in_at is not null
    and v_state.next_check_in_at
        <= p_now + interval '5 minutes'
  then
    return 'check_in_due';
  end if;

  return 'normal';
end;
$$;

revoke all
on function private.safe_date_member_protection_state(
  uuid,
  uuid,
  timestamptz
)
from public, anon, authenticated;


create or replace function public.get_my_safe_date_intelligence(
  p_date_plan_id uuid
)
returns table (
  protection_state text,
  check_in_due boolean,
  check_in_overdue boolean,
  location_consent_active boolean,
  location_consent_expires_at timestamptz,
  assistance_active boolean,
  safe_arrival_confirmed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_session_id uuid;
  v_state public.safe_date_member_states%rowtype;
  v_protection_state text;
begin
  select m.id
  into v_member_id
  from public.members m
  where m.auth_user_id = auth.uid();

  if v_member_id is null then
    raise exception 'Member profile not found.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select ms.*
  into v_state
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  v_protection_state :=
    private.safe_date_member_protection_state(
      v_session_id,
      v_member_id,
      now()
    );

  return query
  select
    v_protection_state,
    v_protection_state = 'check_in_due',
    v_protection_state = 'check_in_overdue',
    (
      coalesce(v_state.location_sharing_enabled, false)
      and v_state.location_sharing_expires_at is not null
      and v_state.location_sharing_expires_at > now()
    ),
    v_state.location_sharing_expires_at,
    (
      v_state.assistance_requested_at is not null
      and (
        v_state.assistance_cleared_at is null
        or v_state.assistance_cleared_at
           < v_state.assistance_requested_at
      )
    ),
    v_state.safe_arrival_confirmed_at is not null;
end;
$$;

revoke all
on function public.get_my_safe_date_intelligence(uuid)
from public, anon;

grant execute
on function public.get_my_safe_date_intelligence(uuid)
to authenticated;


create or replace function private.purge_expired_safe_date_locations(
  p_retention interval default interval '24 hours'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_retention < interval '1 hour'
     or p_retention > interval '7 days' then
    raise exception 'SafeDate location retention must be between 1 hour and 7 days.';
  end if;

  delete from public.safe_date_location_events le
  where le.captured_at < now() - p_retention;

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all
on function private.purge_expired_safe_date_locations(interval)
from public, anon, authenticated;


create or replace function private.expire_safe_date_location_consents()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.safe_date_member_states ms
  set
    location_sharing_enabled = false,
    updated_at = now()
  where ms.location_sharing_enabled = true
    and ms.location_sharing_expires_at is not null
    and ms.location_sharing_expires_at <= now();

  get diagnostics v_updated = row_count;

  return v_updated;
end;
$$;

revoke all
on function private.expire_safe_date_location_consents()
from public, anon, authenticated;


create or replace function private.safe_date_intelligence_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_consents integer;
  v_deleted_locations integer;
begin
  v_expired_consents :=
    private.expire_safe_date_location_consents();

  v_deleted_locations :=
    private.purge_expired_safe_date_locations(
      interval '24 hours'
    );

  return jsonb_build_object(
    'expired_location_consents',
    v_expired_consents,
    'deleted_location_events',
    v_deleted_locations,
    'completed_at',
    now()
  );
end;
$$;

revoke all
on function private.safe_date_intelligence_maintenance()
from public, anon, authenticated;
