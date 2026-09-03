-- ============================================================
-- BTME — BUILD 28
-- Membership · verification · access-state authority
--
-- Principles:
--   * mobile/web authenticated clients remain read-only for
--     verification and entitlement authority
--   * trusted infrastructure writes authoritative outcomes
--   * every trusted state transition is auditable
--   * no payment provider is fabricated here
-- ============================================================

-- ------------------------------------------------------------
-- TRUSTED AUTHORITY AUDIT
-- ------------------------------------------------------------

create table public.member_authority_audit (
  id uuid primary key default gen_random_uuid(),

  member_id uuid not null
    references public.members(id)
    on delete cascade,

  authority_type text not null
    check (
      authority_type in (
        'verification',
        'entitlement'
      )
    ),

  action text not null
    check (
      char_length(action) between 1 and 100
    ),

  previous_state jsonb,
  next_state jsonb not null,

  actor_type text not null
    check (
      actor_type in (
        'trusted_server',
        'verification_provider',
        'app_store',
        'manual_admin',
        'migration'
      )
    ),

  actor_reference text,

  created_at timestamptz not null default now(),

  constraint member_authority_audit_actor_reference_length
    check (
      actor_reference is null
      or char_length(actor_reference) between 1 and 500
    )
);

create index member_authority_audit_member_created_idx
  on public.member_authority_audit(
    member_id,
    created_at desc
  );

alter table public.member_authority_audit
  enable row level security;

revoke all
  on table public.member_authority_audit
  from anon;

revoke insert, update, delete
  on table public.member_authority_audit
  from authenticated;

grant select
  on table public.member_authority_audit
  to authenticated;

create policy "Members can read own authority audit"
  on public.member_authority_audit
  for select
  to authenticated
  using (
    member_id = auth.uid()
  );

comment on table public.member_authority_audit is
  'Server-controlled audit history for trusted BTME verification and membership entitlement authority transitions. Authenticated members may read only their own history and cannot write it.';

-- ------------------------------------------------------------
-- TRUSTED VERIFICATION ADJUDICATION
-- ------------------------------------------------------------

create or replace function private.set_member_verification_authority(
  p_member_id uuid,
  p_status text,
  p_provider text default null,
  p_provider_reference text default null,
  p_failure_code text default null,
  p_actor_type text default 'trusted_server',
  p_actor_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous jsonb;
  v_next jsonb;
begin
  if p_member_id is null then
    raise exception 'Member is required.';
  end if;

  if p_status not in (
    'not_started',
    'pending',
    'verified',
    'failed',
    'needs_review'
  ) then
    raise exception 'Invalid verification status.';
  end if;

  if p_actor_type not in (
    'trusted_server',
    'verification_provider',
    'manual_admin',
    'migration'
  ) then
    raise exception 'Invalid verification authority actor.';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = p_member_id
  ) then
    raise exception 'Member not found.';
  end if;

  select to_jsonb(iv)
  into v_previous
  from public.identity_verifications iv
  where iv.member_id = p_member_id;

  insert into public.identity_verifications (
    member_id,
    status,
    provider,
    provider_reference,
    verified_at,
    submitted_at,
    failure_code,
    updated_at
  )
  values (
    p_member_id,
    p_status,
    p_provider,
    p_provider_reference,
    case
      when p_status = 'verified'
        then now()
      else null
    end,
    case
      when p_status in (
        'pending',
        'verified',
        'failed',
        'needs_review'
      )
        then coalesce(
          (
            select iv.submitted_at
            from public.identity_verifications iv
            where iv.member_id = p_member_id
          ),
          now()
        )
      else null
    end,
    case
      when p_status = 'failed'
        then p_failure_code
      else null
    end,
    now()
  )
  on conflict (member_id)
  do update set
    status = excluded.status,
    provider = excluded.provider,
    provider_reference = excluded.provider_reference,
    verified_at = excluded.verified_at,
    submitted_at = excluded.submitted_at,
    failure_code = excluded.failure_code,
    updated_at = now();

  select to_jsonb(iv)
  into v_next
  from public.identity_verifications iv
  where iv.member_id = p_member_id;

  insert into public.member_authority_audit (
    member_id,
    authority_type,
    action,
    previous_state,
    next_state,
    actor_type,
    actor_reference
  )
  values (
    p_member_id,
    'verification',
    'set_verification_status',
    v_previous,
    v_next,
    p_actor_type,
    p_actor_reference
  );
end;
$$;

revoke all
  on function private.set_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  from public;

revoke all
  on function private.set_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  from anon;

revoke all
  on function private.set_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  from authenticated;

comment on function private.set_member_verification_authority(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) is
  'Trusted server-side verification adjudication boundary. Never grant execution to authenticated clients.';

-- ------------------------------------------------------------
-- TRUSTED ENTITLEMENT AUTHORITY
-- ------------------------------------------------------------

create or replace function private.set_member_entitlement_authority(
  p_member_id uuid,
  p_tier text,
  p_status text,
  p_source text,
  p_external_reference text default null,
  p_current_period_ends_at timestamptz default null,
  p_actor_type text default 'trusted_server',
  p_actor_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous jsonb;
  v_next jsonb;
begin
  if p_member_id is null then
    raise exception 'Member is required.';
  end if;

  if p_tier not in (
    'none',
    'premium'
  ) then
    raise exception 'Invalid entitlement tier.';
  end if;

  if p_status not in (
    'inactive',
    'active',
    'grace_period',
    'expired',
    'revoked'
  ) then
    raise exception 'Invalid entitlement status.';
  end if;

  if p_source not in (
    'none',
    'apple_app_store',
    'manual_admin',
    'migration'
  ) then
    raise exception 'Invalid entitlement source.';
  end if;

  if p_actor_type not in (
    'trusted_server',
    'app_store',
    'manual_admin',
    'migration'
  ) then
    raise exception 'Invalid entitlement authority actor.';
  end if;

  if p_tier = 'premium'
     and p_status in ('active', 'grace_period')
     and p_source = 'none' then
    raise exception
      'Active Premium entitlement requires a trusted source.';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = p_member_id
  ) then
    raise exception 'Member not found.';
  end if;

  select to_jsonb(e)
  into v_previous
  from public.member_entitlements e
  where e.member_id = p_member_id;

  insert into public.member_entitlements (
    member_id,
    tier,
    status,
    source,
    external_reference,
    current_period_ends_at,
    verified_at,
    updated_at
  )
  values (
    p_member_id,
    p_tier,
    p_status,
    p_source,
    p_external_reference,
    p_current_period_ends_at,
    case
      when p_tier = 'premium'
       and p_status in ('active', 'grace_period')
        then now()
      else null
    end,
    now()
  )
  on conflict (member_id)
  do update set
    tier = excluded.tier,
    status = excluded.status,
    source = excluded.source,
    external_reference = excluded.external_reference,
    current_period_ends_at = excluded.current_period_ends_at,
    verified_at = excluded.verified_at,
    updated_at = now();

  select to_jsonb(e)
  into v_next
  from public.member_entitlements e
  where e.member_id = p_member_id;

  insert into public.member_authority_audit (
    member_id,
    authority_type,
    action,
    previous_state,
    next_state,
    actor_type,
    actor_reference
  )
  values (
    p_member_id,
    'entitlement',
    'set_entitlement_status',
    v_previous,
    v_next,
    p_actor_type,
    p_actor_reference
  );
end;
$$;

revoke all
  on function private.set_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from public;

revoke all
  on function private.set_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from anon;

revoke all
  on function private.set_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from authenticated;

comment on function private.set_member_entitlement_authority(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text
) is
  'Trusted server-side Premium entitlement authority boundary. Intended for verified App Store/provider/admin infrastructure; never grant execution to authenticated clients.';


-- ------------------------------------------------------------
-- SERVICE-ROLE RPC BRIDGES
--
-- Edge Functions and other trusted Supabase infrastructure
-- cannot rely on authenticated-client privileges.
--
-- These public-schema functions expose NO authority to normal
-- users. Only service_role may execute them.
-- ------------------------------------------------------------

create or replace function public.apply_member_verification_authority(
  p_member_id uuid,
  p_status text,
  p_provider text default null,
  p_provider_reference text default null,
  p_failure_code text default null,
  p_actor_type text default 'trusted_server',
  p_actor_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.set_member_verification_authority(
    p_member_id,
    p_status,
    p_provider,
    p_provider_reference,
    p_failure_code,
    p_actor_type,
    p_actor_reference
  );
end;
$$;

revoke all
  on function public.apply_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  from public;

revoke all
  on function public.apply_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  from anon;

revoke all
  on function public.apply_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  from authenticated;

grant execute
  on function public.apply_member_verification_authority(
    uuid,
    text,
    text,
    text,
    text,
    text,
    text
  )
  to service_role;

comment on function public.apply_member_verification_authority(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) is
  'Service-role-only RPC bridge into BTME trusted identity verification authority. Authenticated members cannot execute this function.';


create or replace function public.apply_member_entitlement_authority(
  p_member_id uuid,
  p_tier text,
  p_status text,
  p_source text,
  p_external_reference text default null,
  p_current_period_ends_at timestamptz default null,
  p_actor_type text default 'trusted_server',
  p_actor_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.set_member_entitlement_authority(
    p_member_id,
    p_tier,
    p_status,
    p_source,
    p_external_reference,
    p_current_period_ends_at,
    p_actor_type,
    p_actor_reference
  );
end;
$$;

revoke all
  on function public.apply_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from public;

revoke all
  on function public.apply_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from anon;

revoke all
  on function public.apply_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from authenticated;

grant execute
  on function public.apply_member_entitlement_authority(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  to service_role;

comment on function public.apply_member_entitlement_authority(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text
) is
  'Service-role-only RPC bridge into BTME trusted Premium entitlement authority. Authenticated members cannot execute this function.';


-- ------------------------------------------------------------
-- MEMBER ACCESS-STATE PROJECTION
-- ------------------------------------------------------------

create or replace function public.get_my_dating_access_state()
returns table (
  account_status text,
  profile_complete boolean,
  verification_status text,
  verification_verified_at timestamptz,
  entitlement_tier text,
  entitlement_status text,
  entitlement_source text,
  entitlement_current_period_ends_at timestamptz,
  entitlement_verified_at timestamptz,
  can_date boolean,
  blocker text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  v_member_id := auth.uid();

  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  return query
  select
    m.account_status,
    coalesce(p.profile_complete, false),
    coalesce(iv.status, 'not_started'),
    iv.verified_at,
    coalesce(e.tier, 'none'),
    coalesce(e.status, 'inactive'),
    coalesce(e.source, 'none'),
    e.current_period_ends_at,
    e.verified_at,
    private.btme_member_can_date(v_member_id),
    case
      when m.account_status <> 'active'
        then 'account'
      when p.member_id is null
        or p.profile_complete <> true
        then 'profile'
      when iv.member_id is null
        or iv.status <> 'verified'
        or iv.verified_at is null
        then 'verification'
      when e.member_id is null
        or e.tier <> 'premium'
        or e.status not in ('active', 'grace_period')
        or e.verified_at is null
        or (
          e.current_period_ends_at is not null
          and e.current_period_ends_at <= now()
        )
        then 'membership'
      else null
    end
  from public.members m
  left join public.profiles p
    on p.member_id = m.id
  left join public.identity_verifications iv
    on iv.member_id = m.id
  left join public.member_entitlements e
    on e.member_id = m.id
  where m.id = v_member_id;
end;
$$;

revoke all
  on function public.get_my_dating_access_state()
  from public;

revoke all
  on function public.get_my_dating_access_state()
  from anon;

grant execute
  on function public.get_my_dating_access_state()
  to authenticated;

comment on function public.get_my_dating_access_state() is
  'Self-only authoritative dating access projection. Explains whether account, profile, verification or Premium membership currently blocks dating access.';
