begin;

drop function if exists public.end_my_safe_date(uuid);

create or replace function public.end_my_safe_date(
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
  v_member_one_id uuid;
  v_member_two_id uuid;
begin
  /*
   * Installation authority is the authentication boundary.
   * It validates auth.uid(), ownership, revocation and secret.
   */
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  /*
   * Resolve and assert that this member is a participant in
   * the active SafeDate session.
   */
  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select
    c.member_one_id,
    c.member_two_id
  into
    v_member_one_id,
    v_member_two_id
  from public.date_plans dp
  join public.connections c
    on c.id = dp.connection_id
  where dp.id = p_date_plan_id;

  if v_member_one_id is null then
    raise exception 'Date plan not found.';
  end if;

  if v_member_id = v_member_one_id then

    update public.safe_date_sessions
    set
      member_one_ended_at =
        coalesce(member_one_ended_at, now()),
      updated_at = now()
    where id = v_session_id;

  elsif v_member_id = v_member_two_id then

    update public.safe_date_sessions
    set
      member_two_ended_at =
        coalesce(member_two_ended_at, now()),
      updated_at = now()
    where id = v_session_id;

  else
    raise exception 'SafeDate participant not found.';
  end if;

  update public.safe_date_sessions
  set
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
  where id = v_session_id
    and member_one_ended_at is not null
    and member_two_ended_at is not null;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'session_end',
    'accepted',
    now(),
    jsonb_build_object(
      'date_plan_id', p_date_plan_id
    )
  );
end;
$function$;

revoke all
on function public.end_my_safe_date(uuid,uuid,text)
from public;

revoke all
on function public.end_my_safe_date(uuid,uuid,text)
from anon;

grant execute
on function public.end_my_safe_date(uuid,uuid,text)
to authenticated;

commit;
