begin;

-- ==========================================================
-- SafeDate strict cleanup authority
--
-- Registration retains create-on-first-use semantics through
-- private.assert_safe_date_installation().
--
-- Cleanup MUST NOT create installation authority.
--
-- Missing installation:
--   authenticated member + valid-shaped secret -> clean no-op
--
-- Existing installation:
--   wrong member -> reject
--   wrong secret -> reject
--   correct authority -> disable/revoke as requested
--
-- Revocation is idempotent.
-- ==========================================================

create or replace function public.disable_my_safe_date_push_tokens(
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
  v_hash text;
  v_installation public.safe_date_installations%rowtype;
begin
  v_member_id := private.safe_date_member_id();

  if p_installation_id is null then
    raise exception 'SafeDate installation ID is required.';
  end if;

  v_hash := private.safe_date_secret_hash(
    p_installation_secret
  );

  select i.*
  into v_installation
  from public.safe_date_installations i
  where i.id = p_installation_id
  for update;

  if v_installation.id is null then
    return;
  end if;

  if v_installation.member_id <> v_member_id then
    raise exception
      'SafeDate installation belongs to another member.';
  end if;

  if v_installation.secret_hash <> v_hash then
    raise exception
      'Invalid SafeDate installation credential.';
  end if;

  update public.safe_date_push_devices
  set
    enabled = false,
    disabled_at = coalesce(disabled_at, now()),
    updated_at = now()
  where member_id = v_member_id
    and installation_id = p_installation_id
    and enabled = true;
end;
$$;

revoke all
on function public.disable_my_safe_date_push_tokens(
  uuid,
  text
)
from public, anon, authenticated, service_role;

grant execute
on function public.disable_my_safe_date_push_tokens(
  uuid,
  text
)
to authenticated;


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
  v_hash text;
  v_installation public.safe_date_installations%rowtype;
begin
  v_member_id := private.safe_date_member_id();

  if p_installation_id is null then
    raise exception 'SafeDate installation ID is required.';
  end if;

  v_hash := private.safe_date_secret_hash(
    p_installation_secret
  );

  select i.*
  into v_installation
  from public.safe_date_installations i
  where i.id = p_installation_id
  for update;

  if v_installation.id is null then
    return;
  end if;

  if v_installation.member_id <> v_member_id then
    raise exception
      'SafeDate installation belongs to another member.';
  end if;

  if v_installation.secret_hash <> v_hash then
    raise exception
      'Invalid SafeDate installation credential.';
  end if;

  if v_installation.revoked_at is null then
    update public.safe_date_installations
    set
      revoked_at = now(),
      updated_at = now()
    where id = p_installation_id
      and member_id = v_member_id;
  end if;

  update public.safe_date_push_devices
  set
    enabled = false,
    disabled_at = coalesce(disabled_at, now()),
    updated_at = now()
  where member_id = v_member_id
    and installation_id = p_installation_id
    and enabled = true;
end;
$$;

revoke all
on function public.revoke_my_safe_date_installation(
  uuid,
  text
)
from public, anon, authenticated, service_role;

grant execute
on function public.revoke_my_safe_date_installation(
  uuid,
  text
)
to authenticated;

commit;
