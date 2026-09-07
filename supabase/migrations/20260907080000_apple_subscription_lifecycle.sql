-- Better Than My Ex™
-- Build 32C — Apple subscription lifecycle authority
--
-- App Store Server Notifications V2 are cryptographically verified
-- by the trusted Edge layer before reaching this RPC.
--
-- Raw signed Apple payloads are deliberately not persisted.

create table private.apple_subscription_notifications (
  notification_uuid uuid primary key,
  notification_type text not null,
  notification_subtype text,
  environment text not null
    check (environment in ('Production', 'Sandbox')),
  original_transaction_id text not null,
  transaction_id text not null,
  transaction_signed_date timestamptz not null,
  notification_signed_date timestamptz not null,
  outcome text not null
    check (outcome in ('processed', 'stale')),
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index apple_subscription_notifications_original_tx_idx
on private.apple_subscription_notifications (
  original_transaction_id
);

create index apple_subscription_notifications_chronology_idx
on private.apple_subscription_notifications (
  original_transaction_id,
  notification_signed_date desc
);

alter table private.apple_subscription_notifications
  enable row level security;

revoke all
on table private.apple_subscription_notifications
from public, anon, authenticated;

grant select, insert
on table private.apple_subscription_notifications
to service_role;

create or replace function public.apply_verified_apple_lifecycle_notification(
  p_notification_uuid uuid,
  p_notification_type text,
  p_notification_subtype text,
  p_environment text,
  p_original_transaction_id text,
  p_latest_transaction_id text,
  p_product_id text,
  p_app_account_token uuid,
  p_entitlement_status text,
  p_purchase_date timestamptz,
  p_transaction_signed_date timestamptz,
  p_notification_signed_date timestamptz,
  p_expires_at timestamptz,
  p_revocation_date timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_notification boolean;
  existing_transaction_signed_date timestamptz;
  latest_notification_signed_date timestamptz;
begin
  if p_notification_uuid is null then
    raise exception 'Apple notification UUID is required';
  end if;

  if nullif(trim(p_notification_type), '') is null then
    raise exception 'Apple notification type is required';
  end if;

  if p_environment not in ('Production', 'Sandbox') then
    raise exception 'unsupported Apple environment';
  end if;

  if nullif(trim(p_original_transaction_id), '') is null
     or nullif(trim(p_latest_transaction_id), '') is null then
    raise exception 'Apple transaction identifiers are required';
  end if;

  if p_app_account_token is null then
    raise exception 'Apple account token is required';
  end if;

  if p_product_id not in (
    'uk.betterthanmyex.app.premium.monthly',
    'uk.betterthanmyex.app.premium.sixmonth',
    'uk.betterthanmyex.app.premium.annual'
  ) then
    raise exception 'unsupported Apple product';
  end if;

  if p_entitlement_status not in (
    'active',
    'grace_period',
    'expired',
    'revoked'
  ) then
    raise exception 'unsupported entitlement status';
  end if;

  if p_purchase_date is null
     or p_transaction_signed_date is null
     or p_notification_signed_date is null then
    raise exception 'Apple lifecycle chronology is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'apple-subscription:' || p_original_transaction_id,
      0
    )
  );

  select exists (
    select 1
    from private.apple_subscription_notifications
    where notification_uuid = p_notification_uuid
  )
  into existing_notification;

  if existing_notification then
    return 'duplicate';
  end if;

  select max(notification_signed_date)
    into latest_notification_signed_date
  from private.apple_subscription_notifications
  where original_transaction_id = p_original_transaction_id
    and outcome = 'processed';

  if latest_notification_signed_date is not null
     and p_notification_signed_date <=
       latest_notification_signed_date then

    insert into private.apple_subscription_notifications (
      notification_uuid,
      notification_type,
      notification_subtype,
      environment,
      original_transaction_id,
      transaction_id,
      transaction_signed_date,
      notification_signed_date,
      outcome,
      processed_at
    )
    values (
      p_notification_uuid,
      p_notification_type,
      nullif(trim(p_notification_subtype), ''),
      p_environment,
      p_original_transaction_id,
      p_latest_transaction_id,
      p_transaction_signed_date,
      p_notification_signed_date,
      'stale',
      now()
    );

    return 'stale';
  end if;

  select signed_date
    into existing_transaction_signed_date
  from private.apple_subscription_bindings
  where original_transaction_id =
    p_original_transaction_id;

  if existing_transaction_signed_date is not null
     and p_transaction_signed_date <
       existing_transaction_signed_date then

    insert into private.apple_subscription_notifications (
      notification_uuid,
      notification_type,
      notification_subtype,
      environment,
      original_transaction_id,
      transaction_id,
      transaction_signed_date,
      notification_signed_date,
      outcome,
      processed_at
    )
    values (
      p_notification_uuid,
      p_notification_type,
      nullif(trim(p_notification_subtype), ''),
      p_environment,
      p_original_transaction_id,
      p_latest_transaction_id,
      p_transaction_signed_date,
      p_notification_signed_date,
      'stale',
      now()
    );

    return 'stale';
  end if;

  perform public.apply_verified_apple_subscription(
    p_member_id := p_app_account_token,
    p_original_transaction_id :=
      p_original_transaction_id,
    p_latest_transaction_id :=
      p_latest_transaction_id,
    p_product_id := p_product_id,
    p_environment := p_environment,
    p_app_account_token := p_app_account_token,
    p_entitlement_status := p_entitlement_status,
    p_purchase_date := p_purchase_date,
    p_signed_date := p_transaction_signed_date,
    p_expires_at := p_expires_at,
    p_revocation_date := p_revocation_date
  );

  insert into private.apple_subscription_notifications (
    notification_uuid,
    notification_type,
    notification_subtype,
    environment,
    original_transaction_id,
    transaction_id,
    transaction_signed_date,
    notification_signed_date,
    outcome,
    processed_at
  )
  values (
    p_notification_uuid,
    p_notification_type,
    nullif(trim(p_notification_subtype), ''),
    p_environment,
    p_original_transaction_id,
    p_latest_transaction_id,
    p_transaction_signed_date,
    p_notification_signed_date,
    'processed',
    now()
  );

  return 'processed';
end;
$$;

revoke all
on function public.apply_verified_apple_lifecycle_notification(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute
on function public.apply_verified_apple_lifecycle_notification(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
)
to service_role;
