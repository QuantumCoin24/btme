-- SafeDate™ Layer Two
-- Abuse resistance, replay resistance and security telemetry.
--
-- Design rule:
-- emergency assistance activation must never be denied merely because
-- a client retried or generated requests rapidly.

begin;

-- ============================================================
-- SECURITY OPERATION TELEMETRY
-- ============================================================

create table public.safe_date_security_operations (
  id uuid primary key default gen_random_uuid(),

  safe_date_session_id uuid not null
    references public.safe_date_sessions(id)
    on delete cascade,

  member_id uuid not null
    references public.members(id)
    on delete cascade,

  operation_type text not null,

  outcome text not null,

  occurred_at timestamptz not null default now(),

  client_event_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint safe_date_security_operations_type_check
    check (
      operation_type in (
        'check_in',
        'assistance_request',
        'assistance_clear',
        'location_record'
      )
    ),

  constraint safe_date_security_operations_outcome_check
    check (
      outcome in (
        'accepted',
        'duplicate',
        'rate_limited',
        'rejected'
      )
    ),

  constraint safe_date_security_operations_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index safe_date_security_operations_member_time_idx
on public.safe_date_security_operations (
  member_id,
  occurred_at desc
);

create index safe_date_security_operations_session_time_idx
on public.safe_date_security_operations (
  safe_date_session_id,
  occurred_at desc
);

alter table public.safe_date_security_operations
enable row level security;

revoke all
on table public.safe_date_security_operations
from public, anon, authenticated;


-- ============================================================
-- INTERNAL SECURITY TELEMETRY WRITER
-- ============================================================

create or replace function private.record_safe_date_security_operation(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_operation_type text,
  p_outcome text,
  p_client_event_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_operation_type not in (
    'check_in',
    'assistance_request',
    'assistance_clear',
    'location_record'
  ) then
    raise exception 'Unsupported SafeDate security operation.';
  end if;

  if p_outcome not in (
    'accepted',
    'duplicate',
    'rate_limited',
    'rejected'
  ) then
    raise exception 'Unsupported SafeDate security outcome.';
  end if;

  insert into public.safe_date_security_operations (
    safe_date_session_id,
    member_id,
    operation_type,
    outcome,
    client_event_at,
    metadata
  )
  values (
    p_safe_date_session_id,
    p_member_id,
    p_operation_type,
    p_outcome,
    p_client_event_at,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all
on function private.record_safe_date_security_operation(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  jsonb
)
from public, anon, authenticated;


-- ============================================================
-- CHECK-IN ABUSE RESISTANCE
--
-- A legitimate member does not need multiple accepted check-ins
-- within a few seconds. Rapid retries become harmless duplicates.
-- ============================================================

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
  v_last_check_in_at timestamptz;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  -- Serialize security-sensitive member/session mutation.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:check-in:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    ms.check_in_interval_minutes,
    ms.last_check_in_at
  into
    v_interval,
    v_last_check_in_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  if v_last_check_in_at is not null
     and v_last_check_in_at > now() - interval '5 seconds'
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      'check_in',
      'duplicate',
      null,
      jsonb_build_object(
        'previous_check_in_at',
        v_last_check_in_at
      )
    );

    return;
  end if;

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

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    'check_in',
    'accepted'
  );
end;
$$;

revoke all on function public.check_in_my_safe_date(uuid)
from public, anon;

grant execute on function public.check_in_my_safe_date(uuid)
to authenticated;


-- ============================================================
-- ASSISTANCE ACTIVATION
--
-- CRITICAL:
-- Never rate-limit away an emergency assistance request.
--
-- Repeated activation while assistance is already active is
-- idempotent: preserve the original activation timestamp.
-- ============================================================

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
  v_requested_at timestamptz;
  v_cleared_at timestamptz;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:assistance:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    ms.assistance_requested_at,
    ms.assistance_cleared_at
  into
    v_requested_at,
    v_cleared_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  if v_requested_at is not null
     and (
       v_cleared_at is null
       or v_cleared_at < v_requested_at
     )
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      'assistance_request',
      'duplicate',
      null,
      jsonb_build_object(
        'active_since',
        v_requested_at
      )
    );

    return;
  end if;

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

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    'assistance_request',
    'accepted'
  );
end;
$$;

revoke all
on function public.request_my_safe_date_assistance(uuid)
from public, anon;

grant execute
on function public.request_my_safe_date_assistance(uuid)
to authenticated;


-- ============================================================
-- ASSISTANCE CLEARING
--
-- Clearing an already-cleared/non-existent request is harmless
-- and does not manufacture a new state transition.
-- ============================================================

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
  v_requested_at timestamptz;
  v_cleared_at timestamptz;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:assistance:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    ms.assistance_requested_at,
    ms.assistance_cleared_at
  into
    v_requested_at,
    v_cleared_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  if v_requested_at is null
     or (
       v_cleared_at is not null
       and v_cleared_at >= v_requested_at
     )
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      'assistance_clear',
      'duplicate'
    );

    return;
  end if;

  update public.safe_date_member_states
  set assistance_cleared_at = now()
  where safe_date_session_id = v_session_id
    and member_id = v_member_id;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    'assistance_clear',
    'accepted'
  );
end;
$$;

revoke all
on function public.clear_my_safe_date_assistance(uuid)
from public, anon;

grant execute
on function public.clear_my_safe_date_assistance(uuid)
to authenticated;


-- ============================================================
-- LOCATION ANTI-REPLAY / ORDERING
--
-- Existing protections retained:
--   * authenticated participant
--   * coordinate validation
--   * accuracy validation
--   * absolute freshness window
--   * active member protection
--   * active location consent
--
-- New protection:
--   * captured_at must advance beyond last accepted sample.
-- ============================================================

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
  v_last_captured_at timestamptz;
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
    raise exception
      'Location capture time is outside the accepted window.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:location:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
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
    raise exception
      'Your SafeDate protection is no longer active.';
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
    raise exception
      'Active SafeDate location consent is required.';
  end if;

  select max(le.captured_at)
  into v_last_captured_at
  from public.safe_date_location_events le
  where le.safe_date_session_id = v_session_id
    and le.member_id = v_member_id;

  if v_last_captured_at is not null
     and p_captured_at <= v_last_captured_at
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      'location_record',
      'rejected',
      p_captured_at,
      jsonb_build_object(
        'reason',
        'stale_or_replayed_location',
        'last_accepted_captured_at',
        v_last_captured_at
      )
    );

    return;
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

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    'location_record',
    'accepted',
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
