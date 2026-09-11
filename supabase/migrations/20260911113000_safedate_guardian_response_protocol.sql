begin;

/*
 * BTME SafeDate — Guardian Response Protocol
 *
 * Server-side orchestration layer over the existing canonical
 * SafeDate session, escalation, safety-event and security-operation
 * authorities.
 *
 * Design rules:
 *
 * 1. Guardian never bypasses installation authentication.
 * 2. Guardian never grants authority over another participant.
 * 3. Guardian never enables location consent.
 * 4. Existing location evidence may only be associated when the
 *    participant has independently enabled location sharing.
 * 5. Existing escalation machinery remains canonical.
 * 6. Operations are idempotent where an active escalation already
 *    exists.
 * 7. Guardian is not an emergency-services dispatch mechanism.
 */

alter table public.safe_date_escalations
  drop constraint if exists safe_date_escalations_type_check;

alter table public.safe_date_escalations
  add constraint safe_date_escalations_type_check
  check (
    escalation_type in (
      'missed_check_in',
      'assistance_requested',
      'guardian_silent_assistance'
    )
  );

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
      'escalation_resolved',
      'assistance_acknowledged',
      'guardian_silent_assistance_requested',
      'guardian_response_acknowledged',
      'guardian_response_resolved'
    )
  );

alter table public.safe_date_security_operations
  drop constraint if exists safe_date_security_operations_type_check;

alter table public.safe_date_security_operations
  add constraint safe_date_security_operations_type_check
  check (
    operation_type in (
      'session_start',
      'session_end',
      'check_in_configure',
      'check_in',
      'assistance_request',
      'assistance_acknowledge',
      'assistance_clear',
      'safe_arrival_confirm',
      'location_consent',
      'location_record',
      'trusted_contact_add',
      'trusted_contact_revoke',
      'trusted_contact_activation',
      'trusted_contact_invite_create',
      'trusted_contact_invite_accept',
      'guardian_silent_assistance',
      'guardian_acknowledge',
      'guardian_resolve'
    )
  );

/*
 * Canonical SafeDate escalation creator.
 *
 * Guardian extends the existing escalation authority rather than
 * creating a parallel escalation engine.
 *
 * Existing notification-outbox behaviour is preserved.
 */
create or replace function private.create_safe_date_escalation(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_escalation_type text,
  p_source_event_id uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_escalation_id uuid;
  v_inserted boolean := false;
  v_contact record;
begin
  if p_escalation_type not in (
    'missed_check_in',
    'assistance_requested',
    'guardian_silent_assistance'
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
  where e.safe_date_session_id = p_safe_date_session_id
    and e.member_id = p_member_id
    and e.escalation_type = p_escalation_type
    and e.status in ('active', 'acknowledged')
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
      where e.source_event_id = p_source_event_id
      limit 1;
    end if;

    if v_escalation_id is null then
      select e.id
      into v_escalation_id
      from public.safe_date_escalations e
      where e.safe_date_session_id = p_safe_date_session_id
        and e.member_id = p_member_id
        and e.escalation_type = p_escalation_type
        and e.status in ('active', 'acknowledged')
      order by e.opened_at desc
      limit 1;
    end if;

    if v_escalation_id is null then
      raise exception 'SafeDate escalation could not be created.';
    end if;

    return v_escalation_id;
  end if;

  v_inserted := true;

  if v_inserted then
    perform private.record_safe_date_safety_event(
      p_safe_date_session_id,
      p_member_id,
      'escalation_opened',
      'escalation-opened:' || v_escalation_id::text,
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
      where stc.safe_date_session_id = p_safe_date_session_id
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
          when p_escalation_type = 'missed_check_in'
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
$function$;


/*
 * Request silent assistance.
 *
 * This deliberately uses the existing escalation authority.
 * It does NOT change location consent and does NOT dispatch
 * emergency services.
 */

create or replace function public.request_my_safe_date_guardian_assistance(
  p_date_plan_id uuid,
  p_installation_id uuid,
  p_installation_secret text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member_id uuid;
  v_session_id uuid;
  v_event_id uuid;
  v_escalation_id uuid;
begin

  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select e.id
  into v_escalation_id
  from public.safe_date_escalations e
  where e.safe_date_session_id = v_session_id
    and e.member_id = v_member_id
    and e.escalation_type = 'guardian_silent_assistance'
    and e.status in ('active', 'acknowledged')
  order by e.opened_at desc
  limit 1;

  if v_escalation_id is not null then

    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      p_installation_id,
      'guardian_silent_assistance',
      'duplicate',
      now(),
      jsonb_build_object(
        'date_plan_id', p_date_plan_id,
        'escalation_id', v_escalation_id
      )
    );

    return v_escalation_id;

  end if;

  v_event_id :=
    private.record_safe_date_safety_event(
      v_session_id,
      v_member_id,
      'guardian_silent_assistance_requested',
      'guardian:silent:' || v_session_id::text || ':' ||
        v_member_id::text,
      jsonb_build_object(
        'date_plan_id', p_date_plan_id,
        'silent', true,
        'emergency_dispatch', false
      ),
      now()
    );

  v_escalation_id :=
    private.create_safe_date_escalation(
      v_session_id,
      v_member_id,
      'guardian_silent_assistance',
      v_event_id
    );

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'guardian_silent_assistance',
    'accepted',
    now(),
    jsonb_build_object(
      'date_plan_id', p_date_plan_id,
      'escalation_id', v_escalation_id
    )
  );

  return v_escalation_id;

end;
$function$;


/*
 * Participant acknowledgement.
 */

create or replace function public.acknowledge_my_safe_date_guardian_response(
  p_date_plan_id uuid,
  p_installation_id uuid,
  p_installation_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member_id uuid;
  v_session_id uuid;
  v_escalation_id uuid;
begin

  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select e.id
  into v_escalation_id
  from public.safe_date_escalations e
  where e.safe_date_session_id = v_session_id
    and e.member_id = v_member_id
    and e.escalation_type = 'guardian_silent_assistance'
    and e.status = 'active'
  order by e.opened_at desc
  limit 1
  for update;

  if v_escalation_id is null then
    raise exception 'No active Guardian response.';
  end if;

  update public.safe_date_escalations
  set
    status = 'acknowledged',
    acknowledged_at = coalesce(acknowledged_at, now()),
    updated_at = now()
  where id = v_escalation_id;

  perform private.record_safe_date_safety_event(
    v_session_id,
    v_member_id,
    'guardian_response_acknowledged',
    'guardian:ack:' || v_escalation_id::text,
    jsonb_build_object(
      'date_plan_id', p_date_plan_id,
      'escalation_id', v_escalation_id
    ),
    now()
  );

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'guardian_acknowledge',
    'accepted',
    now(),
    jsonb_build_object(
      'date_plan_id', p_date_plan_id,
      'escalation_id', v_escalation_id
    )
  );

end;
$function$;


/*
 * Resolve Guardian response.
 */

create or replace function public.resolve_my_safe_date_guardian_response(
  p_date_plan_id uuid,
  p_installation_id uuid,
  p_installation_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member_id uuid;
  v_session_id uuid;
  v_escalation_id uuid;
begin

  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select e.id
  into v_escalation_id
  from public.safe_date_escalations e
  where e.safe_date_session_id = v_session_id
    and e.member_id = v_member_id
    and e.escalation_type = 'guardian_silent_assistance'
    and e.status in ('active', 'acknowledged')
  order by e.opened_at desc
  limit 1
  for update;

  if v_escalation_id is null then
    raise exception 'No unresolved Guardian response.';
  end if;

  update public.safe_date_escalations
  set
    status = 'resolved',
    resolved_at = coalesce(resolved_at, now()),
    resolution_reason =
      coalesce(resolution_reason, 'participant_resolved'),
    updated_at = now()
  where id = v_escalation_id;

  perform private.record_safe_date_safety_event(
    v_session_id,
    v_member_id,
    'guardian_response_resolved',
    'guardian:resolved:' || v_escalation_id::text,
    jsonb_build_object(
      'date_plan_id', p_date_plan_id,
      'escalation_id', v_escalation_id
    ),
    now()
  );

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'guardian_resolve',
    'accepted',
    now(),
    jsonb_build_object(
      'date_plan_id', p_date_plan_id,
      'escalation_id', v_escalation_id
    )
  );

end;
$function$;


revoke all
on function public.request_my_safe_date_guardian_assistance(
  uuid,
  uuid,
  text
)
from public;

revoke all
on function public.request_my_safe_date_guardian_assistance(
  uuid,
  uuid,
  text
)
from anon;

grant execute
on function public.request_my_safe_date_guardian_assistance(
  uuid,
  uuid,
  text
)
to authenticated;


revoke all
on function public.acknowledge_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
from public;

revoke all
on function public.acknowledge_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
from anon;

grant execute
on function public.acknowledge_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
to authenticated;


revoke all
on function public.resolve_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
from public;

revoke all
on function public.resolve_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
from anon;

grant execute
on function public.resolve_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
to authenticated;

commit;
