begin;

create table public.safe_date_location_events (
  id uuid primary key default gen_random_uuid(),

  safe_date_session_id uuid not null
    references public.safe_date_sessions(id) on delete cascade,

  member_id uuid not null
    references public.members(id) on delete cascade,

  latitude double precision not null
    check (latitude between -90 and 90),

  longitude double precision not null
    check (longitude between -180 and 180),

  accuracy_metres double precision
    check (
      accuracy_metres is null
      or (
        accuracy_metres >= 0
        and accuracy_metres <= 10000
      )
    ),

  captured_at timestamptz not null,

  received_at timestamptz not null default now()
);

create index safe_date_location_events_session_member_time_idx
on public.safe_date_location_events (
  safe_date_session_id,
  member_id,
  captured_at desc
);

alter table public.safe_date_location_events
enable row level security;

revoke all
on table public.safe_date_location_events
from public, anon, authenticated;

create or replace function public.record_my_safe_date_location(
  p_date_plan_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_metres double precision,
  p_captured_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
  v_my_ended_at timestamptz;
  v_closed_at timestamptz;
  v_consent_enabled boolean;
  v_consent_expires_at timestamptz;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_latitude is null
     or p_latitude < -90
     or p_latitude > 90 then
    raise exception 'Latitude is invalid.';
  end if;

  if p_longitude is null
     or p_longitude < -180
     or p_longitude > 180 then
    raise exception 'Longitude is invalid.';
  end if;

  if p_accuracy_metres is not null
     and (
       p_accuracy_metres < 0
       or p_accuracy_metres > 10000
     ) then
    raise exception 'Location accuracy is invalid.';
  end if;

  if p_captured_at is null then
    raise exception 'Location capture time is required.';
  end if;

  if p_captured_at < now() - interval '5 minutes'
     or p_captured_at > now() + interval '1 minute' then
    raise exception 'Location capture time is outside the accepted window.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select
    case
      when c.member_one_id = v_member_id
        then s.member_one_ended_at
      else s.member_two_ended_at
    end,
    s.closed_at
  into
    v_my_ended_at,
    v_closed_at
  from public.safe_date_sessions s
  join public.date_plans dp
    on dp.id = s.date_plan_id
  join public.connections c
    on c.id = dp.connection_id
  where s.id = v_session_id;

  if v_my_ended_at is not null
     or v_closed_at is not null then
    raise exception 'Your SafeDate protection is no longer active.';
  end if;

  select
    ms.location_sharing_enabled,
    ms.location_sharing_expires_at
  into
    v_consent_enabled,
    v_consent_expires_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  if coalesce(v_consent_enabled, false) = false
     or v_consent_expires_at is null
     or v_consent_expires_at <= now() then
    raise exception 'Active SafeDate location consent is required.';
  end if;

  insert into public.safe_date_location_events (
    safe_date_session_id,
    member_id,
    latitude,
    longitude,
    accuracy_metres,
    captured_at
  )
  values (
    v_session_id,
    v_member_id,
    p_latitude,
    p_longitude,
    p_accuracy_metres,
    p_captured_at
  );
end;
$$;

revoke all
on function public.record_my_safe_date_location(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz
)
from public, anon;

grant execute
on function public.record_my_safe_date_location(
  uuid,
  double precision,
  double precision,
  double precision,
  timestamptz
)
to authenticated;

commit;
