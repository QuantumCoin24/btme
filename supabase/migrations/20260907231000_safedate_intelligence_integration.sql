-- SafeDate Intelligence Integration
-- Observes successful authoritative mutations and writes privacy-safe
-- audit events without changing the existing public RPC boundaries.

create or replace function private.audit_safe_date_session_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.record_safe_date_safety_event(
      new.id,
      new.started_by,
      'session_started',
      'session_started:' || new.id::text,
      jsonb_build_object(
        'date_plan_id',
        new.date_plan_id
      ),
      new.started_at
    );

    return new;
  end if;

  if
    old.member_one_ended_at is null
    and new.member_one_ended_at is not null
  then
    perform private.record_safe_date_safety_event(
      new.id,
      (
        select c.member_one_id
        from public.date_plans dp
        join public.connections c
          on c.id = dp.connection_id
        where dp.id = new.date_plan_id
      ),
      'member_ended',
      'member_ended:one:' || new.id::text,
      '{}'::jsonb,
      new.member_one_ended_at
    );
  end if;

  if
    old.member_two_ended_at is null
    and new.member_two_ended_at is not null
  then
    perform private.record_safe_date_safety_event(
      new.id,
      (
        select c.member_two_id
        from public.date_plans dp
        join public.connections c
          on c.id = dp.connection_id
        where dp.id = new.date_plan_id
      ),
      'member_ended',
      'member_ended:two:' || new.id::text,
      '{}'::jsonb,
      new.member_two_ended_at
    );
  end if;

  if
    old.closed_at is null
    and new.closed_at is not null
  then
    perform private.record_safe_date_safety_event(
      new.id,
      null,
      'session_closed',
      'session_closed:' || new.id::text,
      '{}'::jsonb,
      new.closed_at
    );
  end if;

  return new;
end;
$$;

revoke all
on function private.audit_safe_date_session_change()
from public, anon, authenticated;

drop trigger if exists
safe_date_sessions_intelligence_audit
on public.safe_date_sessions;

create trigger safe_date_sessions_intelligence_audit
after insert or update
on public.safe_date_sessions
for each row
execute function private.audit_safe_date_session_change();


create or replace function private.audit_safe_date_member_state_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_interval integer;
  v_old_last_check_in timestamptz;
  v_old_assistance_requested timestamptz;
  v_old_assistance_cleared timestamptz;
  v_old_arrival timestamptz;
  v_old_location_enabled boolean;
  v_old_location_expiry timestamptz;
begin
  if tg_op = 'INSERT' then
    v_old_interval := null;
    v_old_last_check_in := null;
    v_old_assistance_requested := null;
    v_old_assistance_cleared := null;
    v_old_arrival := null;
    v_old_location_enabled := false;
    v_old_location_expiry := null;
  else
    v_old_interval := old.check_in_interval_minutes;
    v_old_last_check_in := old.last_check_in_at;
    v_old_assistance_requested := old.assistance_requested_at;
    v_old_assistance_cleared := old.assistance_cleared_at;
    v_old_arrival := old.safe_arrival_confirmed_at;
    v_old_location_enabled :=
      coalesce(old.location_sharing_enabled, false);
    v_old_location_expiry :=
      old.location_sharing_expires_at;
  end if;

  if
    new.check_in_interval_minutes
      is distinct from v_old_interval
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      'check_in_configured',
      null,
      jsonb_build_object(
        'enabled',
        new.check_in_interval_minutes is not null,
        'interval_minutes',
        new.check_in_interval_minutes
      ),
      now()
    );
  end if;

  if
    new.last_check_in_at is not null
    and new.last_check_in_at
      is distinct from v_old_last_check_in
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      'check_in_completed',
      'check_in_completed:'
        || new.safe_date_session_id::text
        || ':'
        || new.member_id::text
        || ':'
        || extract(
             epoch from new.last_check_in_at
           )::bigint::text,
      jsonb_build_object(
        'next_check_in_at',
        new.next_check_in_at
      ),
      new.last_check_in_at
    );
  end if;

  if
    new.assistance_requested_at is not null
    and new.assistance_requested_at
      is distinct from v_old_assistance_requested
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      'assistance_requested',
      'assistance_requested:'
        || new.safe_date_session_id::text
        || ':'
        || new.member_id::text
        || ':'
        || extract(
             epoch from new.assistance_requested_at
           )::bigint::text,
      '{}'::jsonb,
      new.assistance_requested_at
    );
  end if;

  if
    new.assistance_cleared_at is not null
    and new.assistance_cleared_at
      is distinct from v_old_assistance_cleared
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      'assistance_cleared',
      'assistance_cleared:'
        || new.safe_date_session_id::text
        || ':'
        || new.member_id::text
        || ':'
        || extract(
             epoch from new.assistance_cleared_at
           )::bigint::text,
      '{}'::jsonb,
      new.assistance_cleared_at
    );
  end if;

  if
    new.safe_arrival_confirmed_at is not null
    and new.safe_arrival_confirmed_at
      is distinct from v_old_arrival
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      'safe_arrival_confirmed',
      'safe_arrival_confirmed:'
        || new.safe_date_session_id::text
        || ':'
        || new.member_id::text,
      '{}'::jsonb,
      new.safe_arrival_confirmed_at
    );
  end if;

  if
    coalesce(new.location_sharing_enabled, false)
    and (
      not v_old_location_enabled
      or new.location_sharing_expires_at
        is distinct from v_old_location_expiry
    )
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      'location_enabled',
      null,
      jsonb_build_object(
        'expires_at',
        new.location_sharing_expires_at
      ),
      now()
    );
  end if;

  if
    not coalesce(new.location_sharing_enabled, false)
    and v_old_location_enabled
  then
    perform private.record_safe_date_safety_event(
      new.safe_date_session_id,
      new.member_id,
      case
        when v_old_location_expiry is not null
         and v_old_location_expiry <= now()
          then 'location_expired'
        else 'location_disabled'
      end,
      null,
      '{}'::jsonb,
      now()
    );
  end if;

  return new;
end;
$$;

revoke all
on function private.audit_safe_date_member_state_change()
from public, anon, authenticated;

drop trigger if exists
safe_date_member_states_intelligence_audit
on public.safe_date_member_states;

create trigger safe_date_member_states_intelligence_audit
after insert or update
on public.safe_date_member_states
for each row
execute function private.audit_safe_date_member_state_change();


create or replace function private.audit_safe_date_location_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.record_safe_date_safety_event(
    new.safe_date_session_id,
    new.member_id,
    'location_recorded',
    'location_recorded:' || new.id::text,
    jsonb_build_object(
      'captured_at',
      new.captured_at,
      'accuracy_available',
      new.accuracy_metres is not null
    ),
    new.received_at
  );

  return new;
end;
$$;

revoke all
on function private.audit_safe_date_location_recorded()
from public, anon, authenticated;

drop trigger if exists
safe_date_location_events_intelligence_audit
on public.safe_date_location_events;

create trigger safe_date_location_events_intelligence_audit
after insert
on public.safe_date_location_events
for each row
execute function private.audit_safe_date_location_recorded();


create or replace function private.record_due_safe_date_check_ins(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_recorded integer := 0;
  v_key text;
begin
  for v_row in
    select
      ms.safe_date_session_id,
      ms.member_id,
      ms.next_check_in_at
    from public.safe_date_member_states ms
    join public.safe_date_sessions s
      on s.id = ms.safe_date_session_id
    join public.date_plans dp
      on dp.id = s.date_plan_id
    join public.connections c
      on c.id = dp.connection_id
    where ms.check_in_interval_minutes is not null
      and ms.next_check_in_at is not null
      and ms.next_check_in_at <= p_now
      and s.closed_at is null
      and (
        (
          c.member_one_id = ms.member_id
          and s.member_one_ended_at is null
        )
        or
        (
          c.member_two_id = ms.member_id
          and s.member_two_ended_at is null
        )
      )
  loop
    v_key :=
      'check_in_missed:'
      || v_row.safe_date_session_id::text
      || ':'
      || v_row.member_id::text
      || ':'
      || extract(
           epoch from v_row.next_check_in_at
         )::bigint::text;

    if not exists (
      select 1
      from public.safe_date_safety_events e
      where e.event_key = v_key
    ) then
      perform private.record_safe_date_safety_event(
        v_row.safe_date_session_id,
        v_row.member_id,
        'check_in_missed',
        v_key,
        jsonb_build_object(
          'due_at',
          v_row.next_check_in_at
        ),
        p_now
      );

      v_recorded := v_recorded + 1;
    end if;
  end loop;

  return v_recorded;
end;
$$;

revoke all
on function private.record_due_safe_date_check_ins(timestamptz)
from public, anon, authenticated;


create or replace function private.safe_date_intelligence_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missed_check_ins integer;
  v_expired_consents integer;
  v_deleted_locations integer;
begin
  v_missed_check_ins :=
    private.record_due_safe_date_check_ins(now());

  v_expired_consents :=
    private.expire_safe_date_location_consents();

  v_deleted_locations :=
    private.purge_expired_safe_date_locations(
      interval '24 hours'
    );

  return jsonb_build_object(
    'recorded_missed_check_ins',
    v_missed_check_ins,
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
