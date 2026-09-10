-- ============================================================
-- BTME SafeDate
-- Security Operation Contract Alignment
--
-- Forward-only production compatibility repair.
-- ============================================================

alter table public.safe_date_security_operations
  drop constraint if exists
    safe_date_security_operations_type_check;

alter table public.safe_date_security_operations
  add constraint
    safe_date_security_operations_type_check
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
      'trusted_contact_invite_accept'
    )
  );

drop function if exists
  private.record_safe_date_security_operation(
    uuid,
    uuid,
    text,
    text,
    timestamptz,
    jsonb
  );

revoke all
on function private.record_safe_date_security_operation(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  jsonb
)
from public, anon, authenticated;
