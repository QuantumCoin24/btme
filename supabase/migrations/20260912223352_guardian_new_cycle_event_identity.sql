-- Guardian Silent Assistance — new-cycle event identity repair
--
-- Invariants:
--   * active / acknowledged Guardian escalation remains idempotent
--   * resolved / cancelled Guardian escalation does not block a new cycle
--   * every genuinely new Guardian cycle receives a new source event
--   * historical events and escalations remain immutable
--   * recorder / escalation creator / reader / resolver remain unchanged

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

  /*
   * Cycle idempotency authority.
   *
   * If a Guardian cycle is currently unresolved, repeated requests return
   * that same escalation and do not create another safety event/escalation.
   */
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

  /*
   * No unresolved Guardian cycle exists.
   *
   * This is therefore a NEW Guardian request cycle.
   *
   * The previous implementation used:
   *
   *   guardian:silent:<session>:<member>
   *
   * which permanently identified the participant/session pair and caused
   * the safety-event recorder to return the historical source event after
   * the first cycle had been resolved.
   *
   * A new UUID suffix gives each genuinely new cycle its own immutable
   * ledger identity while preserving the existing event-key uniqueness
   * contract.
   */
  v_event_id :=
    private.record_safe_date_safety_event(
      v_session_id,
      v_member_id,
      'guardian_silent_assistance_requested',
      'guardian:silent:' ||
        v_session_id::text || ':' ||
        v_member_id::text || ':' ||
        gen_random_uuid()::text,
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
