-- ============================================================
-- BTME / SafeDate
-- Protection-state ambiguity repair
--
-- Root cause:
-- get_my_safe_date_protection RETURNS TABLE exposes a PL/pgSQL
-- output variable named safe_date_session_id. The former
-- The former column-list conflict target could resolve the
-- output-variable name ambiguously inside PL/pgSQL.
--
-- Repair:
-- Target the existing primary-key constraint explicitly.
-- ============================================================

create or replace function public.get_my_safe_date_protection(
  p_date_plan_id uuid
)
returns table (
  safe_date_session_id uuid,
  check_in_interval_minutes integer,
  next_check_in_at timestamptz,
  last_check_in_at timestamptz,
  safe_arrival_confirmed_at timestamptz,
  assistance_requested_at timestamptz,
  trusted_contact_enabled boolean,
  location_sharing_enabled boolean,
  location_sharing_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id
  )
  values (
    v_session_id,
    v_member_id
  )
  on conflict on constraint safe_date_member_states_pkey
  do nothing;

  return query
  select
    ms.safe_date_session_id,
    ms.check_in_interval_minutes,
    ms.next_check_in_at,
    ms.last_check_in_at,
    ms.safe_arrival_confirmed_at,
    case
      when ms.assistance_requested_at is not null
       and (
         ms.assistance_cleared_at is null
         or ms.assistance_requested_at >
            ms.assistance_cleared_at
       )
        then ms.assistance_requested_at
      else null
    end,
    ms.trusted_contact_enabled,
    ms.location_sharing_enabled,
    ms.location_sharing_expires_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;
end;
$$;

revoke all
on function public.get_my_safe_date_protection(uuid)
from public, anon;

grant execute
on function public.get_my_safe_date_protection(uuid)
to authenticated;
