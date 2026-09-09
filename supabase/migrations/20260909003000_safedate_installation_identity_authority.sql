begin;

-- ============================================================
-- 32C.11C.2
-- Canonical member identity + authenticated installation
-- authority + installation-bound push endpoint ownership.
--
-- Canonical identity:
--   auth.uid() = public.members.id
--
-- Installation credential:
--   client holds random UUID + random secret
--   server stores SHA-256(secret), never plaintext
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PRIVATE INSTALLATION AUTHORITY
-- ------------------------------------------------------------

create table if not exists public.safe_date_installations (
  id uuid primary key,
  member_id uuid not null
    references public.members(id)
    on delete cascade,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint safe_date_installations_secret_hash_check
    check (
      secret_hash ~ '^[0-9a-f]{64}$'
    )
);

create index if not exists
  safe_date_installations_member_idx
on public.safe_date_installations (
  member_id,
  revoked_at
);

alter table public.safe_date_installations
  enable row level security;

revoke all
on table public.safe_date_installations
from anon, authenticated;

create or replace function private.safe_date_member_id()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = v_member_id
      and coalesce(m.account_status, '') <> 'deleted'
  ) then
    raise exception 'Member profile not found.';
  end if;

  return v_member_id;
end;
$$;

revoke all
on function private.safe_date_member_id()
from public, anon, authenticated;

create or replace function private.safe_date_secret_hash(
  p_secret text
)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  if p_secret is null
     or length(p_secret) <> 64
     or p_secret !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'Invalid SafeDate installation credential.';
  end if;

  return encode(
    extensions.digest(
      convert_to(lower(p_secret), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
end;
$$;

revoke all
on function private.safe_date_secret_hash(text)
from public, anon, authenticated;

create or replace function private.assert_safe_date_installation(
  p_installation_id uuid,
  p_installation_secret text
)
returns uuid
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

  v_hash :=
    private.safe_date_secret_hash(
      p_installation_secret
    );

  select i.*
  into v_installation
  from public.safe_date_installations i
  where i.id = p_installation_id
  for update;

  if v_installation.id is null then
    insert into public.safe_date_installations (
      id,
      member_id,
      secret_hash,
      created_at,
      last_seen_at,
      revoked_at,
      updated_at
    )
    values (
      p_installation_id,
      v_member_id,
      v_hash,
      now(),
      now(),
      null,
      now()
    );

    return v_member_id;
  end if;

  if v_installation.member_id <> v_member_id then
    raise exception
      'SafeDate installation belongs to another member.';
  end if;

  if v_installation.revoked_at is not null then
    raise exception 'SafeDate installation has been revoked.';
  end if;

  if v_installation.secret_hash <> v_hash then
    raise exception 'Invalid SafeDate installation credential.';
  end if;

  update public.safe_date_installations
  set
    last_seen_at = now(),
    updated_at = now()
  where id = p_installation_id;

  return v_member_id;
end;
$$;

revoke all
on function private.assert_safe_date_installation(uuid, text)
from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. BIND PUSH ENDPOINTS TO INSTALLATIONS
-- ------------------------------------------------------------

alter table public.safe_date_push_devices
  add column if not exists installation_id uuid;

alter table public.safe_date_push_devices
  drop constraint if exists
    safe_date_push_devices_installation_id_fkey;

alter table public.safe_date_push_devices
  add constraint
    safe_date_push_devices_installation_id_fkey
  foreign key (installation_id)
  references public.safe_date_installations(id)
  on delete set null;

create index if not exists
  safe_date_push_devices_installation_idx
on public.safe_date_push_devices (
  installation_id,
  enabled
);

-- Legacy rows remain nullable until their next authenticated
-- registration. New registration always binds an installation.

-- ------------------------------------------------------------
-- 3. REMOVE LEGACY PUSH DOWNGRADE PATHS
-- ------------------------------------------------------------

drop function if exists
public.register_my_safe_date_push_token(text);

drop function if exists
public.disable_my_safe_date_push_tokens();

-- ------------------------------------------------------------
-- 4. INSTALLATION-BOUND PUSH REGISTRATION
-- ------------------------------------------------------------

create or replace function public.register_my_safe_date_push_token(
  p_expo_push_token text,
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
  v_token text := trim(p_expo_push_token);
  v_existing public.safe_date_push_devices%rowtype;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  if length(v_token) < 20
     or length(v_token) > 512 then
    raise exception 'Invalid push token.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_token, 0)
  );

  select d.*
  into v_existing
  from public.safe_date_push_devices d
  where d.expo_push_token = v_token
  for update;

  if v_existing.id is not null
     and v_existing.member_id <> v_member_id then
    raise exception
      'Push token is already owned by another member.';
  end if;

  if v_existing.id is not null
     and v_existing.installation_id is not null
     and v_existing.installation_id <> p_installation_id then
    raise exception
      'Push token is already bound to another installation.';
  end if;

  if v_existing.id is null then
    insert into public.safe_date_push_devices (
      member_id,
      installation_id,
      expo_push_token,
      enabled,
      disabled_at,
      updated_at
    )
    values (
      v_member_id,
      p_installation_id,
      v_token,
      true,
      null,
      now()
    );
  else
    update public.safe_date_push_devices
    set
      installation_id = p_installation_id,
      enabled = true,
      disabled_at = null,
      updated_at = now()
    where id = v_existing.id;
  end if;
end;
$$;

revoke all
on function public.register_my_safe_date_push_token(
  text,
  uuid,
  text
)
from public, anon;

grant execute
on function public.register_my_safe_date_push_token(
  text,
  uuid,
  text
)
to authenticated;

-- ------------------------------------------------------------
-- 5. INSTALLATION-SCOPED PUSH DISABLE
-- ------------------------------------------------------------

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
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  update public.safe_date_push_devices
  set
    enabled = false,
    disabled_at =
      coalesce(disabled_at, now()),
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
from public, anon;

grant execute
on function public.disable_my_safe_date_push_tokens(
  uuid,
  text
)
to authenticated;

-- ------------------------------------------------------------
-- 6. REPAIR ASSISTANCE ACKNOWLEDGEMENT IDENTITY
-- ------------------------------------------------------------

create or replace function public.acknowledge_my_safe_date_assistance(
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
  v_member_id := private.safe_date_member_id();

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  update public.safe_date_escalations
  set
    status = 'acknowledged',
    acknowledged_at =
      coalesce(acknowledged_at, now()),
    updated_at = now()
  where safe_date_session_id = v_session_id
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
on function public.acknowledge_my_safe_date_assistance(uuid)
from public, anon;

grant execute
on function public.acknowledge_my_safe_date_assistance(uuid)
to authenticated;

-- ------------------------------------------------------------
-- 7. REPAIR TRUSTED-CONTACT LINK STATE IDENTITY
-- ------------------------------------------------------------

create or replace function
public.get_my_safe_date_trusted_contact_link_state(
  p_trusted_contact_id uuid
)
returns table (
  linked boolean,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  v_member_id := private.safe_date_member_id();

  return query
  select
    tc.linked_member_id is not null,
    tc.linked_at
  from public.safe_date_trusted_contacts tc
  where tc.id = p_trusted_contact_id
    and tc.member_id = v_member_id
    and tc.revoked_at is null;
end;
$$;

revoke all
on function
public.get_my_safe_date_trusted_contact_link_state(uuid)
from public, anon;

grant execute
on function
public.get_my_safe_date_trusted_contact_link_state(uuid)
to authenticated;

-- ------------------------------------------------------------
-- 8. REPAIR TRUSTED-CONTACT INVITE CREATION IDENTITY
-- ------------------------------------------------------------

create or replace function
public.create_my_safe_date_trusted_contact_invite(
  p_trusted_contact_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_token uuid;
begin
  v_member_id := private.safe_date_member_id();

  if not exists (
    select 1
    from public.safe_date_trusted_contacts tc
    where tc.id = p_trusted_contact_id
      and tc.member_id = v_member_id
      and tc.revoked_at is null
  ) then
    raise exception 'Trusted contact not found.';
  end if;

  update public.safe_date_trusted_contact_invites
  set revoked_at = now()
  where trusted_contact_id = p_trusted_contact_id
    and owner_member_id = v_member_id
    and accepted_at is null
    and revoked_at is null;

  insert into public.safe_date_trusted_contact_invites (
    trusted_contact_id,
    owner_member_id
  )
  values (
    p_trusted_contact_id,
    v_member_id
  )
  returning token into v_token;

  return v_token;
end;
$$;

revoke all
on function
public.create_my_safe_date_trusted_contact_invite(uuid)
from public, anon;

grant execute
on function
public.create_my_safe_date_trusted_contact_invite(uuid)
to authenticated;

-- ------------------------------------------------------------
-- 9. REPAIR TRUSTED-CONTACT INVITE ACCEPTANCE IDENTITY
-- ------------------------------------------------------------

create or replace function
public.accept_safe_date_trusted_contact_invite(
  p_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_invite public.safe_date_trusted_contact_invites%rowtype;
begin
  v_member_id := private.safe_date_member_id();

  select *
  into v_invite
  from public.safe_date_trusted_contact_invites
  where token = p_token
  for update;

  if v_invite.token is null then
    raise exception 'Trusted contact invite not found.';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'Trusted contact invite has been revoked.';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Trusted contact invite has expired.';
  end if;

  if v_invite.owner_member_id = v_member_id then
    raise exception
      'You cannot accept your own trusted contact invite.';
  end if;

  if v_invite.accepted_at is not null
     and v_invite.accepted_by_member_id <> v_member_id then
    raise exception
      'Trusted contact invite has already been accepted.';
  end if;

  update public.safe_date_trusted_contacts
  set
    linked_member_id = v_member_id,
    linked_at = coalesce(linked_at, now())
  where id = v_invite.trusted_contact_id
    and member_id = v_invite.owner_member_id
    and revoked_at is null
    and (
      linked_member_id is null
      or linked_member_id = v_member_id
    );

  if not found then
    raise exception 'Trusted contact could not be linked.';
  end if;

  update public.safe_date_trusted_contact_invites
  set
    accepted_by_member_id = v_member_id,
    accepted_at = coalesce(accepted_at, now())
  where token = p_token;
end;
$$;

revoke all
on function
public.accept_safe_date_trusted_contact_invite(uuid)
from public, anon;

grant execute
on function
public.accept_safe_date_trusted_contact_invite(uuid)
to authenticated;

-- ------------------------------------------------------------
-- 10. REPAIR INTELLIGENCE IDENTITY
-- ------------------------------------------------------------

create or replace function public.get_my_safe_date_intelligence(
  p_date_plan_id uuid
)
returns table (
  protection_state text,
  check_in_due boolean,
  check_in_overdue boolean,
  location_consent_active boolean,
  location_consent_expires_at timestamptz,
  assistance_active boolean,
  safe_arrival_confirmed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_session_id uuid;
  v_state public.safe_date_member_states%rowtype;
  v_protection_state text;
begin
  v_member_id := private.safe_date_member_id();

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  select ms.*
  into v_state
  from public.safe_date_member_states ms
  where ms.safe_date_session_id = v_session_id
    and ms.member_id = v_member_id;

  v_protection_state :=
    private.safe_date_member_protection_state(
      v_session_id,
      v_member_id,
      now()
    );

  return query
  select
    v_protection_state,
    v_protection_state = 'check_in_due',
    v_protection_state = 'check_in_overdue',
    (
      coalesce(
        v_state.location_sharing_enabled,
        false
      )
      and v_state.location_sharing_expires_at
        is not null
      and v_state.location_sharing_expires_at
        > now()
    ),
    v_state.location_sharing_expires_at,
    (
      v_state.assistance_requested_at is not null
      and (
        v_state.assistance_cleared_at is null
        or v_state.assistance_cleared_at
          < v_state.assistance_requested_at
      )
    ),
    v_state.safe_arrival_confirmed_at is not null;
end;
$$;

revoke all
on function public.get_my_safe_date_intelligence(uuid)
from public, anon;

grant execute
on function public.get_my_safe_date_intelligence(uuid)
to authenticated;

-- ------------------------------------------------------------
-- 11. ASSERT ZERO LEGACY MEMBER IDENTITY IN CURRENT
--     PUBLIC SAFEDATE FUNCTIONS AFTER THIS MIGRATION.
-- ------------------------------------------------------------

do $$
declare
  v_remaining text;
begin
  select string_agg(
    p.proname
      || '('
      || pg_get_function_identity_arguments(p.oid)
      || ')',
    ', '
    order by p.proname
  )
  into v_remaining
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      p.proname ilike '%safe_date%'
      or pg_get_functiondef(p.oid)
        ilike '%safe_date%'
    )
    and pg_get_functiondef(p.oid)
      ilike '%auth_user_id%';

  if v_remaining is not null then
    raise exception
      'Legacy SafeDate identity remains: %',
      v_remaining;
  end if;
end;
$$;

commit;
