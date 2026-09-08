begin;

alter table public.safe_date_safety_events
  drop constraint if exists
    safe_date_safety_events_type_check;

alter table public.safe_date_safety_events
  add constraint
    safe_date_safety_events_type_check
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
      'assistance_acknowledged'
    )
  );

create or replace function
public.acknowledge_my_safe_date_assistance(
  p_date_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_session_id uuid;
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

  update public.safe_date_escalations
  set
    status = 'acknowledged',
    acknowledged_at = coalesce(
      acknowledged_at,
      now()
    ),
    updated_at = now()
  where safe_date_session_id =
      v_session_id
    and member_id = v_member_id
    and escalation_type =
      'assistance_requested'
    and status = 'active';

  perform private.record_safe_date_safety_event(
    v_session_id,
    v_member_id,
    'assistance_acknowledged',
    'assistance-acknowledged:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
    '{}'::jsonb,
    now()
  );
end;
$$;

revoke all
on function
public.acknowledge_my_safe_date_assistance(uuid)
from public, anon;

grant execute
on function
public.acknowledge_my_safe_date_assistance(uuid)
to authenticated;

commit;
