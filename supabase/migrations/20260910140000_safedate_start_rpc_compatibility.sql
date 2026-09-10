-- ============================================================
-- BTME / SafeDate
-- Production compatibility repair
--
-- Purpose:
--   Align the production SafeDate start boundary with the
--   installation-authority contract already used by the app.
--
-- This is intentionally a forward-only compatibility migration.
-- It does NOT replay historical migration 20260909010000.
-- ============================================================

-- Registration/bootstrap helper

create or replace function private.register_or_assert_safe_date_installation(
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
  v_installation
    public.safe_date_installations%rowtype;
begin
  v_member_id :=
    private.safe_date_member_id();

  if p_installation_id is null then
    raise exception
      'SafeDate installation ID is required.';
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

  if v_installation.member_id
       <> v_member_id
  then
    raise exception
      'SafeDate installation belongs to another member.';
  end if;

  if v_installation.revoked_at
       is not null
  then
    raise exception
      'SafeDate installation has been revoked.';
  end if;

  if v_installation.secret_hash
       <> v_hash
  then
    raise exception
      'Invalid SafeDate installation credential.';
  end if;

  update public.safe_date_installations
  set
    last_seen_at = now(),
    updated_at = now()
  where id = p_installation_id;

  return v_member_id;
end;
$$;

-- Strict protected-operation helper

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
  v_installation
    public.safe_date_installations%rowtype;
begin
  v_member_id :=
    private.safe_date_member_id();

  if p_installation_id is null then
    raise exception
      'SafeDate installation ID is required.';
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
    raise exception
      'SafeDate installation is not registered.';
  end if;

  if v_installation.member_id
       <> v_member_id
  then
    raise exception
      'SafeDate installation belongs to another member.';
  end if;

  if v_installation.revoked_at
       is not null
  then
    raise exception
      'SafeDate installation has been revoked.';
  end if;

  if v_installation.secret_hash
       <> v_hash
  then
    raise exception
      'Invalid SafeDate installation credential.';
  end if;

  update public.safe_date_installations
  set
    last_seen_at = now(),
    updated_at = now()
  where id = p_installation_id;

  return v_member_id;
end;
$$;

-- Explicit authenticated registration boundary

create or replace function public.register_my_safe_date_installation(
  p_installation_id uuid,
  p_installation_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.register_or_assert_safe_date_installation(
    p_installation_id,
    p_installation_secret
  );
end;
$$;


-- ------------------------------------------------------------
-- Security-operation installation provenance
-- ------------------------------------------------------------

alter table public.safe_date_security_operations
  add column if not exists installation_id uuid;

alter table public.safe_date_security_operations
  drop constraint if exists
    safe_date_security_operations_installation_id_fkey;

alter table public.safe_date_security_operations
  add constraint
    safe_date_security_operations_installation_id_fkey
  foreign key (installation_id)
  references public.safe_date_installations(id)
  on delete set null;

create index if not exists
  safe_date_security_operations_installation_time_idx
on public.safe_date_security_operations (
  installation_id,
  occurred_at desc
);

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
      'location_record'
    )
  );

-- Installation-aware security recorder

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
as $$
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
    'trusted_contact_invite_accept'
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
$$;

-- Installation-authoritative SafeDate start RPC

create or replace function public.start_safe_date(
  p_date_plan_id uuid,
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
  v_connection_id uuid;
  v_session_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  select dp.connection_id
  into v_connection_id
  from public.date_plans dp
  join public.connections c
    on c.id = dp.connection_id
  where dp.id = p_date_plan_id
    and c.status = 'active'
    and dp.status <> 'cancelled'
    and (
      c.member_one_id = v_member_id
      or c.member_two_id = v_member_id
    );

  if v_connection_id is null then
    raise exception 'Eligible date plan not found.';
  end if;

  insert into public.safe_date_sessions (
    date_plan_id,
    started_by
  )
  values (
    p_date_plan_id,
    v_member_id
  )
  on conflict (date_plan_id)
  do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select s.id
    into v_session_id
    from public.safe_date_sessions s
    where s.date_plan_id = p_date_plan_id;
  end if;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'session_start',
    'accepted'
  );

  return v_session_id;
end;
$$;


-- ------------------------------------------------------------
-- Privilege authority
-- ------------------------------------------------------------

revoke all
on function private.register_or_assert_safe_date_installation(
  uuid,
  text
)
from public, anon, authenticated;

revoke all
on function private.assert_safe_date_installation(
  uuid,
  text
)
from public, anon, authenticated;

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

revoke all
on function public.register_my_safe_date_installation(
  uuid,
  text
)
from public, anon;

grant execute
on function public.register_my_safe_date_installation(
  uuid,
  text
)
to authenticated;

revoke all
on function public.start_safe_date(
  uuid,
  uuid,
  text
)
from public, anon;

grant execute
on function public.start_safe_date(
  uuid,
  uuid,
  text
)
to authenticated;

-- Remove the obsolete one-argument public RPC only after the
-- replacement contract has been created in this transaction.
drop function if exists public.start_safe_date(uuid);
