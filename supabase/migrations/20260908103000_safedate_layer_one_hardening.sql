begin;

create extension if not exists pg_cron;

alter table public.safe_date_safety_events
  drop constraint if exists safe_date_safety_events_type_check;

alter table public.safe_date_safety_events
  add constraint safe_date_safety_events_type_check
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
      'protection_state_changed',
      'trusted_contact_enabled',
      'trusted_contact_disabled',
      'escalation_opened',
      'escalation_resolved'
    )
  );

create unique index if not exists
safe_date_notification_outbox_escalation_contact_type_uidx
on public.safe_date_notification_outbox (
  escalation_id,
  trusted_contact_id,
  notification_type
)
where escalation_id is not null
  and trusted_contact_id is not null;

create or replace function private.assert_safe_date_trusted_contact_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closed_at timestamptz;
  v_member_one_id uuid;
  v_member_two_id uuid;
  v_member_one_ended_at timestamptz;
  v_member_two_ended_at timestamptz;
begin
  if new.disabled_at is not null then
    return new;
  end if;

  select
    s.closed_at,
    c.member_one_id,
    c.member_two_id,
    s.member_one_ended_at,
    s.member_two_ended_at
  into
    v_closed_at,
    v_member_one_id,
    v_member_two_id,
    v_member_one_ended_at,
    v_member_two_ended_at
  from public.safe_date_sessions s
  join public.date_plans dp
    on dp.id = s.date_plan_id
  join public.connections c
    on c.id = dp.connection_id
  where s.id = new.safe_date_session_id;

  if not found then
    raise exception 'SafeDate session not found.';
  end if;

  if new.member_id not in (
    v_member_one_id,
    v_member_two_id
  ) then
    raise exception 'SafeDate participant mismatch.';
  end if;

  if v_closed_at is not null then
    raise exception 'SafeDate is already closed.';
  end if;

  if
    new.member_id = v_member_one_id
    and v_member_one_ended_at is not null
  then
    raise exception 'Your SafeDate protection has ended.';
  end if;

  if
    new.member_id = v_member_two_id
    and v_member_two_ended_at is not null
  then
    raise exception 'Your SafeDate protection has ended.';
  end if;

  return new;
end;
$$;

revoke all
on function private.assert_safe_date_trusted_contact_activation()
from public, anon, authenticated;

drop trigger if exists
safe_date_trusted_contact_activation_guard
on public.safe_date_session_trusted_contacts;

create trigger safe_date_trusted_contact_activation_guard
before insert or update
on public.safe_date_session_trusted_contacts
for each row
execute function private.assert_safe_date_trusted_contact_activation();

create or replace function private.sync_safe_date_trusted_contact_state(
  p_safe_date_session_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
begin
  select exists (
    select 1
    from public.safe_date_session_trusted_contacts stc
    join public.safe_date_trusted_contacts tc
      on tc.id = stc.trusted_contact_id
    where stc.safe_date_session_id =
      p_safe_date_session_id
      and stc.member_id = p_member_id
      and stc.disabled_at is null
      and tc.revoked_at is null
  )
  into v_enabled;

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    trusted_contact_enabled
  )
  values (
    p_safe_date_session_id,
    p_member_id,
    v_enabled
  )
  on conflict (
    safe_date_session_id,
    member_id
  )
  do update
  set trusted_contact_enabled =
    excluded.trusted_contact_enabled;
end;
$$;

revoke all
on function private.sync_safe_date_trusted_contact_state(
  uuid,
  uuid
)
from public, anon, authenticated;

create or replace function private.audit_safe_date_trusted_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_member_id uuid;
  v_enabled boolean;
begin
  v_session_id := coalesce(
    new.safe_date_session_id,
    old.safe_date_session_id
  );

  v_member_id := coalesce(
    new.member_id,
    old.member_id
  );

  perform private.sync_safe_date_trusted_contact_state(
    v_session_id,
    v_member_id
  );

  select exists (
    select 1
    from public.safe_date_session_trusted_contacts stc
    join public.safe_date_trusted_contacts tc
      on tc.id = stc.trusted_contact_id
    where stc.safe_date_session_id = v_session_id
      and stc.member_id = v_member_id
      and stc.disabled_at is null
      and tc.revoked_at is null
  )
  into v_enabled;

  perform private.record_safe_date_safety_event(
    v_session_id,
    v_member_id,
    case
      when v_enabled
        then 'trusted_contact_enabled'
      else 'trusted_contact_disabled'
    end,
    'trusted-contact-state:'
      || v_session_id::text
      || ':'
      || v_member_id::text
      || ':'
      || txid_current()::text,
    '{}'::jsonb,
    now()
  );

  return coalesce(new, old);
end;
$$;

revoke all
on function private.audit_safe_date_trusted_contact_change()
from public, anon, authenticated;

drop trigger if exists
safe_date_trusted_contact_state_sync
on public.safe_date_session_trusted_contacts;

create trigger safe_date_trusted_contact_state_sync
after insert or update or delete
on public.safe_date_session_trusted_contacts
for each row
execute function private.audit_safe_date_trusted_contact_change();

create or replace function private.sync_revoked_safe_date_trusted_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if
    old.revoked_at is distinct from new.revoked_at
  then
    for v_row in
      select distinct
        stc.safe_date_session_id,
        stc.member_id
      from public.safe_date_session_trusted_contacts stc
      where stc.trusted_contact_id = new.id
    loop
      perform private.sync_safe_date_trusted_contact_state(
        v_row.safe_date_session_id,
        v_row.member_id
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all
on function private.sync_revoked_safe_date_trusted_contact()
from public, anon, authenticated;

drop trigger if exists
safe_date_trusted_contact_revocation_sync
on public.safe_date_trusted_contacts;

create trigger safe_date_trusted_contact_revocation_sync
after update of revoked_at
on public.safe_date_trusted_contacts
for each row
execute function private.sync_revoked_safe_date_trusted_contact();

create or replace function private.disable_ended_safe_date_trusted_contacts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_one_id uuid;
  v_member_two_id uuid;
begin
  select
    c.member_one_id,
    c.member_two_id
  into
    v_member_one_id,
    v_member_two_id
  from public.date_plans dp
  join public.connections c
    on c.id = dp.connection_id
  where dp.id = new.date_plan_id;

  if
    old.member_one_ended_at is null
    and new.member_one_ended_at is not null
  then
    update public.safe_date_session_trusted_contacts
    set disabled_at = coalesce(
      disabled_at,
      new.member_one_ended_at
    )
    where safe_date_session_id = new.id
      and member_id = v_member_one_id
      and disabled_at is null;
  end if;

  if
    old.member_two_ended_at is null
    and new.member_two_ended_at is not null
  then
    update public.safe_date_session_trusted_contacts
    set disabled_at = coalesce(
      disabled_at,
      new.member_two_ended_at
    )
    where safe_date_session_id = new.id
      and member_id = v_member_two_id
      and disabled_at is null;
  end if;

  return new;
end;
$$;

revoke all
on function private.disable_ended_safe_date_trusted_contacts()
from public, anon, authenticated;

drop trigger if exists
safe_date_disable_ended_trusted_contacts
on public.safe_date_sessions;

create trigger safe_date_disable_ended_trusted_contacts
after update
on public.safe_date_sessions
for each row
execute function private.disable_ended_safe_date_trusted_contacts();

create or replace function private.create_safe_date_escalation(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_escalation_type text,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_escalation_id uuid;
  v_inserted boolean := false;
  v_contact record;
begin
  if p_escalation_type not in (
    'missed_check_in',
    'assistance_requested'
  ) then
    raise exception 'Unsupported SafeDate escalation type.';
  end if;

  if p_source_event_id is not null then
    select e.id
    into v_escalation_id
    from public.safe_date_escalations e
    where e.source_event_id = p_source_event_id
    limit 1;

    if v_escalation_id is not null then
      return v_escalation_id;
    end if;
  end if;

  select e.id
  into v_escalation_id
  from public.safe_date_escalations e
  where e.safe_date_session_id =
      p_safe_date_session_id
    and e.member_id = p_member_id
    and e.escalation_type =
      p_escalation_type
    and e.status in (
      'active',
      'acknowledged'
    )
  order by e.opened_at desc
  limit 1;

  if v_escalation_id is not null then
    return v_escalation_id;
  end if;

  insert into public.safe_date_escalations (
    safe_date_session_id,
    member_id,
    escalation_type,
    source_event_id
  )
  values (
    p_safe_date_session_id,
    p_member_id,
    p_escalation_type,
    p_source_event_id
  )
  on conflict do nothing
  returning id
  into v_escalation_id;

  if v_escalation_id is null then
    if p_source_event_id is not null then
      select e.id
      into v_escalation_id
      from public.safe_date_escalations e
      where e.source_event_id =
        p_source_event_id
      limit 1;
    end if;

    if v_escalation_id is null then
      select e.id
      into v_escalation_id
      from public.safe_date_escalations e
      where e.safe_date_session_id =
          p_safe_date_session_id
        and e.member_id = p_member_id
        and e.escalation_type =
          p_escalation_type
        and e.status in (
          'active',
          'acknowledged'
        )
      order by e.opened_at desc
      limit 1;
    end if;

    if v_escalation_id is null then
      raise exception
        'SafeDate escalation could not be created.';
    end if;

    return v_escalation_id;
  end if;

  v_inserted := true;

  if v_inserted then
    perform private.record_safe_date_safety_event(
      p_safe_date_session_id,
      p_member_id,
      'escalation_opened',
      'escalation-opened:'
        || v_escalation_id::text,
      jsonb_build_object(
        'escalation_type',
        p_escalation_type
      ),
      now()
    );

    for v_contact in
      select stc.trusted_contact_id
      from public.safe_date_session_trusted_contacts stc
      join public.safe_date_trusted_contacts tc
        on tc.id = stc.trusted_contact_id
      where stc.safe_date_session_id =
          p_safe_date_session_id
        and stc.member_id = p_member_id
        and stc.disabled_at is null
        and tc.revoked_at is null
    loop
      insert into public.safe_date_notification_outbox (
        safe_date_session_id,
        member_id,
        trusted_contact_id,
        escalation_id,
        notification_type,
        payload
      )
      values (
        p_safe_date_session_id,
        p_member_id,
        v_contact.trusted_contact_id,
        v_escalation_id,
        case
          when p_escalation_type =
            'missed_check_in'
          then 'check_in_missed'
          else 'assistance_requested'
        end,
        jsonb_build_object(
          'escalation_type',
          p_escalation_type
        )
      )
      on conflict do nothing;
    end loop;
  end if;

  return v_escalation_id;
end;
$$;

revoke all
on function private.create_safe_date_escalation(
  uuid,
  uuid,
  text,
  uuid
)
from public, anon, authenticated;

create or replace function private.resolve_safe_date_escalations(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_escalation_type text,
  p_resolution_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_escalation record;
begin
  if p_escalation_type not in (
    'missed_check_in',
    'assistance_requested'
  ) then
    raise exception 'Unsupported SafeDate escalation type.';
  end if;

  for v_escalation in
    update public.safe_date_escalations
    set
      status = 'resolved',
      resolved_at = now(),
      resolution_reason =
        p_resolution_reason,
      updated_at = now()
    where safe_date_session_id =
        p_safe_date_session_id
      and member_id = p_member_id
      and escalation_type =
        p_escalation_type
      and status in (
        'active',
        'acknowledged'
      )
    returning
      id,
      safe_date_session_id,
      member_id
  loop
    v_count := v_count + 1;

    insert into public.safe_date_notification_outbox (
      safe_date_session_id,
      member_id,
      trusted_contact_id,
      escalation_id,
      notification_type,
      payload
    )
    select distinct
      v_escalation.safe_date_session_id,
      v_escalation.member_id,
      original.trusted_contact_id,
      v_escalation.id,
      'escalation_recovered',
      jsonb_build_object(
        'escalation_type',
        p_escalation_type,
        'reason',
        p_resolution_reason
      )
    from public.safe_date_notification_outbox original
    where original.escalation_id =
        v_escalation.id
      and original.trusted_contact_id
        is not null
      and original.notification_type in (
        'check_in_missed',
        'assistance_requested'
      )
    on conflict do nothing;

    perform private.record_safe_date_safety_event(
      v_escalation.safe_date_session_id,
      v_escalation.member_id,
      'escalation_resolved',
      'escalation-resolved:'
        || v_escalation.id::text,
      jsonb_build_object(
        'escalation_type',
        p_escalation_type,
        'reason',
        p_resolution_reason
      ),
      now()
    );
  end loop;

  return v_count;
end;
$$;

revoke all
on function private.resolve_safe_date_escalations(
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated;

select cron.schedule(
  'safedate-intelligence-maintenance',
  '* * * * *',
  $cron$
    select private.safe_date_intelligence_maintenance();
  $cron$
);

commit;
