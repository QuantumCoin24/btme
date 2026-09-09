begin;

-- ============================================================
-- 32C.11C.4
-- SafeDate installation revocation lifecycle.
--
-- Contract:
--   authenticated member
--     -> strict installation credential assertion
--     -> revoke installation
--     -> disable all push endpoints bound to installation
--
-- Revocation is permanent for the installation identifier.
-- A revoked installation is never silently rebound.
-- ============================================================

create or replace function public.revoke_my_safe_date_installation(
  p_installation_id uuid,
  p_installation_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  update public.safe_date_installations
  set
    revoked_at = coalesce(revoked_at, now()),
    updated_at = now()
  where id = p_installation_id
    and member_id = v_member_id;

  if not found then
    raise exception
      'SafeDate installation could not be revoked.';
  end if;

  update public.safe_date_push_devices
  set
    enabled = false,
    disabled_at = coalesce(disabled_at, now()),
    updated_at = now()
  where installation_id = p_installation_id
    and member_id = v_member_id
    and enabled = true;
end;
$$;

revoke all
on function public.revoke_my_safe_date_installation(
  uuid,
  text
)
from public, anon;

grant execute
on function public.revoke_my_safe_date_installation(
  uuid,
  text
)
to authenticated;

commit;
