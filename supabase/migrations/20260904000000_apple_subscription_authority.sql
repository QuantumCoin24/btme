-- Better Than My Ex™
-- Build 29 — Apple subscription authority
--
-- Apple subscription ownership is server authoritative.
-- Authenticated/mobile clients receive no direct write access.

create table if not exists private.apple_subscription_bindings (
  original_transaction_id text primary key,
  member_id uuid not null references public.members(id) on delete cascade,

  latest_transaction_id text not null,
  product_id text not null,
  environment text not null,

  app_account_token uuid not null,

  entitlement_status text not null
    check (entitlement_status in (
      'active',
      'grace_period',
      'expired',
      'revoked'
    )),

  purchase_date timestamptz not null,

  signed_date timestamptz not null,

  expires_at timestamptz,
  revocation_date timestamptz,

  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint apple_subscription_product_check
    check (
      product_id in (
        'uk.betterthanmyex.app.premium.monthly',
        'uk.betterthanmyex.app.premium.sixmonth',
        'uk.betterthanmyex.app.premium.annual'
      )
    ),

  constraint apple_subscription_environment_check
    check (environment in ('Production', 'Sandbox')),

  constraint apple_subscription_member_token_check
    check (member_id = app_account_token)
);

create unique index if not exists
  apple_subscription_latest_transaction_unique
on private.apple_subscription_bindings (latest_transaction_id);

create index if not exists
  apple_subscription_member_idx
on private.apple_subscription_bindings (member_id);

alter table private.apple_subscription_bindings enable row level security;

-- Deliberately no authenticated SELECT/INSERT/UPDATE/DELETE policies.
-- Subscription ownership data is private server authority.

revoke all on table private.apple_subscription_bindings
from public, anon, authenticated;

grant select, insert, update, delete
on table private.apple_subscription_bindings
to service_role;


create or replace function public.apply_verified_apple_subscription(
  p_member_id uuid,
  p_original_transaction_id text,
  p_latest_transaction_id text,
  p_product_id text,
  p_environment text,
  p_app_account_token uuid,
  p_entitlement_status text,
  p_purchase_date timestamptz,
  p_signed_date timestamptz,
  p_expires_at timestamptz,
  p_revocation_date timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_member_id uuid;
  existing_signed_date timestamptz;
  authority_status text;
begin
  if p_member_id is null then
    raise exception 'member id is required';
  end if;

  if p_app_account_token is null
     or p_app_account_token <> p_member_id then
    raise exception 'Apple account token does not match member';
  end if;

  if nullif(trim(p_original_transaction_id), '') is null
     or nullif(trim(p_latest_transaction_id), '') is null then
    raise exception 'Apple transaction identifiers are required';
  end if;

  if p_product_id not in (
    'uk.betterthanmyex.app.premium.monthly',
    'uk.betterthanmyex.app.premium.sixmonth',
    'uk.betterthanmyex.app.premium.annual'
  ) then
    raise exception 'unsupported Apple product';
  end if;

  if p_environment not in ('Production', 'Sandbox') then
    raise exception 'unsupported Apple environment';
  end if;

  if p_entitlement_status not in (
    'active',
    'grace_period',
    'expired',
    'revoked'
  ) then
    raise exception 'unsupported entitlement status';
  end if;

  if p_purchase_date is null or p_signed_date is null then
    raise exception 'Apple transaction chronology is required';
  end if;

  -- Serialize claims against the same original transaction.
  perform pg_advisory_xact_lock(
    hashtextextended(p_original_transaction_id, 0)
  );

  select member_id, signed_date
    into existing_member_id, existing_signed_date
  from private.apple_subscription_bindings
  where original_transaction_id = p_original_transaction_id;

  if existing_member_id is not null
     and existing_member_id <> p_member_id then
    raise exception 'Apple subscription is already bound to another member';
  end if;

  -- Never allow an older Apple-signed transaction to
  -- overwrite newer subscription authority.
  if existing_signed_date is not null
     and p_signed_date < existing_signed_date then
    raise exception 'stale Apple subscription transaction rejected';
  end if;

  -- A transaction cannot be replayed against another original subscription.
  if exists (
    select 1
    from private.apple_subscription_bindings
    where latest_transaction_id = p_latest_transaction_id
      and original_transaction_id <> p_original_transaction_id
  ) then
    raise exception 'Apple transaction replay detected';
  end if;

  insert into private.apple_subscription_bindings (
    original_transaction_id,
    member_id,
    latest_transaction_id,
    product_id,
    environment,
    app_account_token,
    entitlement_status,
    purchase_date,
    signed_date,
    expires_at,
    revocation_date,
    last_verified_at,
    updated_at
  )
  values (
    p_original_transaction_id,
    p_member_id,
    p_latest_transaction_id,
    p_product_id,
    p_environment,
    p_app_account_token,
    p_entitlement_status,
    p_purchase_date,
    p_signed_date,
    p_expires_at,
    p_revocation_date,
    now(),
    now()
  )
  on conflict (original_transaction_id)
  do update set
    latest_transaction_id = excluded.latest_transaction_id,
    product_id = excluded.product_id,
    environment = excluded.environment,
    app_account_token = excluded.app_account_token,
    entitlement_status = excluded.entitlement_status,
    purchase_date = excluded.purchase_date,
    signed_date = excluded.signed_date,
    expires_at = excluded.expires_at,
    revocation_date = excluded.revocation_date,
    last_verified_at = now(),
    updated_at = now()
  where private.apple_subscription_bindings.member_id = excluded.member_id
    and excluded.signed_date >= private.apple_subscription_bindings.signed_date;

  authority_status :=
    case p_entitlement_status
      when 'active' then 'active'
      when 'grace_period' then 'grace_period'
      when 'expired' then 'expired'
      when 'revoked' then 'revoked'
    end;

  perform public.apply_member_entitlement_authority(
    p_member_id := p_member_id,
    p_tier := case
      when authority_status in ('active', 'grace_period')
        then 'premium'
      else 'none'
    end,
    p_status := authority_status,
    p_source := 'apple_app_store',
    p_external_reference := p_original_transaction_id,
    p_current_period_ends_at := p_expires_at,
    p_actor_type := 'apple_app_store',
    p_actor_reference := p_latest_transaction_id
  );
end;
$$;

revoke all on function public.apply_verified_apple_subscription(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute on function public.apply_verified_apple_subscription(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
)
to service_role;

comment on table private.apple_subscription_bindings is
  'Server-authoritative Apple subscription ownership and lifecycle state.';

comment on function public.apply_verified_apple_subscription is
  'Service-role-only bridge from cryptographically verified Apple subscription data to BTME membership authority.';
