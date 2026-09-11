begin;

create or replace function public.get_my_safe_date_guardian_response(
  p_date_plan_id uuid,
  p_installation_id uuid,
  p_installation_secret text
)
returns table (
  escalation_id uuid,
  status text,
  opened_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member_id uuid;
  v_session_id uuid;
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

  return query
  select
    e.id,
    e.status,
    e.opened_at,
    e.acknowledged_at,
    e.resolved_at
  from public.safe_date_escalations e
  where e.safe_date_session_id = v_session_id
    and e.member_id = v_member_id
    and e.escalation_type = 'guardian_silent_assistance'
    and e.status in ('active', 'acknowledged')
  order by e.opened_at desc
  limit 1;
end;
$function$;

revoke all
on function public.get_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
from public;

revoke all
on function public.get_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
from anon;

grant execute
on function public.get_my_safe_date_guardian_response(
  uuid,
  uuid,
  text
)
to authenticated;

commit;
