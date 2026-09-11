-- SafeDate Guardian security-operation recorder alignment.
--
-- The Guardian response protocol extended the
-- safe_date_security_operations table constraint with:
--
--   guardian_silent_assistance
--   guardian_acknowledge
--   guardian_resolve
--
-- The canonical private recorder retained its pre-Guardian allowlist.
-- This migration aligns that recorder with the already-live table
-- constraint without changing its signature or audit-write behaviour.

create or replace function private.record_safe_date_security_operation(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_installation_id uuid,
  p_operation_type text,
  p_outcome text,
  p_client_event_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_operation_type not in (
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
  ) then
    raise exception
      'Unsupported SafeDate security operation.';
  end if;

  if p_outcome not in (
    'accepted',
    'duplicate',
    'rate_limited',
    'rejected'
  ) then
    raise exception
      'Unsupported SafeDate security outcome.';
  end if;

  insert into public.safe_date_security_operations (
    safe_date_session_id,
    member_id,
    installation_id,
    operation_type,
    outcome,
    client_event_at,
    metadata
  )
  values (
    p_safe_date_session_id,
    p_member_id,
    p_installation_id,
    p_operation_type,
    p_outcome,
    p_client_event_at,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$function$;

revoke all on function private.record_safe_date_security_operation(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  jsonb
) from public;

revoke all on function private.record_safe_date_security_operation(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  jsonb
) from anon;

revoke all on function private.record_safe_date_security_operation(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  jsonb
) from authenticated;
