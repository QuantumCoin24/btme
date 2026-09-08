begin;

create table public.safe_date_push_deliveries (
  id uuid primary key default gen_random_uuid(),

  outbox_id uuid not null
    references public.safe_date_notification_outbox(id)
    on delete cascade,

  push_device_id uuid not null
    references public.safe_date_push_devices(id)
    on delete cascade,

  expo_push_token text not null,

  status text not null default 'pending',

  provider_ticket_id text,
  provider_status text,

  attempt_count integer not null default 0,

  available_at timestamptz not null default now(),
  ticketed_at timestamptz,
  receipt_checked_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,

  last_error text,

  created_at timestamptz not null default now(),

  constraint safe_date_push_deliveries_status_check
    check (
      status in (
        'pending',
        'processing',
        'ticketed',
        'delivered',
        'failed'
      )
    ),

  constraint safe_date_push_deliveries_outbox_device_uidx
    unique (
      outbox_id,
      push_device_id
    )
);

alter table public.safe_date_push_deliveries
enable row level security;

revoke all
on table public.safe_date_push_deliveries
from public, anon, authenticated;

create index
safe_date_push_deliveries_work_idx
on public.safe_date_push_deliveries (
  status,
  available_at
);


create or replace function
private.prepare_safe_date_push_deliveries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  insert into public.safe_date_push_deliveries (
    outbox_id,
    push_device_id,
    expo_push_token
  )
  select
    o.id,
    d.id,
    d.expo_push_token
  from public.safe_date_notification_outbox o
  join public.safe_date_trusted_contacts tc
    on tc.id = o.trusted_contact_id
  join public.safe_date_push_devices d
    on d.member_id = tc.linked_member_id
  where o.status in (
      'pending',
      'processing'
    )
    and o.available_at <= now()
    and tc.revoked_at is null
    and tc.linked_member_id is not null
    and d.enabled = true
    and d.disabled_at is null
  on conflict (
    outbox_id,
    push_device_id
  )
  do nothing;

  get diagnostics v_count = row_count;

  update public.safe_date_notification_outbox o
  set
    delivery_channel = 'expo_push',
    destination_member_id =
      tc.linked_member_id
  from public.safe_date_trusted_contacts tc
  where tc.id = o.trusted_contact_id
    and tc.linked_member_id is not null
    and o.delivery_channel is null;

  return v_count;
end;
$$;

revoke all
on function
private.prepare_safe_date_push_deliveries()
from public, anon, authenticated;

grant execute
on function
private.prepare_safe_date_push_deliveries()
to service_role;


create or replace function
public.claim_safe_date_push_deliveries(
  p_limit integer default 50
)
returns table (
  delivery_id uuid,
  outbox_id uuid,
  push_device_id uuid,
  expo_push_token text,
  notification_type text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform
    private.prepare_safe_date_push_deliveries();

  return query
  with candidates as (
    select d.id
    from public.safe_date_push_deliveries d
    where d.status = 'pending'
      and d.available_at <= now()
      and d.attempt_count < 5
    order by d.created_at
    for update skip locked
    limit greatest(
      1,
      least(
        coalesce(p_limit, 50),
        100
      )
    )
  ),
  claimed as (
    update public.safe_date_push_deliveries d
    set
      status = 'processing',
      attempt_count =
        d.attempt_count + 1
    from candidates c
    where d.id = c.id
    returning
      d.id,
      d.outbox_id,
      d.push_device_id,
      d.expo_push_token
  )
  select
    c.id,
    c.outbox_id,
    c.push_device_id,
    c.expo_push_token,
    o.notification_type
  from claimed c
  join public.safe_date_notification_outbox o
    on o.id = c.outbox_id;
end;
$$;

revoke all
on function
public.claim_safe_date_push_deliveries(integer)
from public, anon, authenticated;

grant execute
on function
public.claim_safe_date_push_deliveries(integer)
to service_role;


create or replace function
public.mark_safe_date_push_ticket(
  p_delivery_id uuid,
  p_ticket_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.safe_date_push_deliveries
  set
    status = 'ticketed',
    provider_ticket_id = p_ticket_id,
    provider_status = 'ticket_ok',
    ticketed_at = now(),
    last_error = null
  where id = p_delivery_id;
end;
$$;

revoke all
on function
public.mark_safe_date_push_ticket(
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function
public.mark_safe_date_push_ticket(
  uuid,
  text
)
to service_role;


create or replace function
public.retry_safe_date_push_delivery(
  p_delivery_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer;
begin
  select attempt_count
  into v_attempt
  from public.safe_date_push_deliveries
  where id = p_delivery_id;

  update public.safe_date_push_deliveries
  set
    status =
      case
        when coalesce(v_attempt, 5) >= 5
          then 'failed'
        else 'pending'
      end,

    available_at =
      case
        when coalesce(v_attempt, 5) >= 5
          then available_at
        else
          now()
          +
          make_interval(
            secs =>
              least(
                300,
                (
                  power(
                    2,
                    greatest(v_attempt, 1)
                  ) * 5
                )::integer
              )
          )
      end,

    failed_at =
      case
        when coalesce(v_attempt, 5) >= 5
          then now()
        else null
      end,

    provider_status = 'retry',

    last_error =
      left(
        coalesce(
          p_error,
          'push_failed'
        ),
        500
      )

  where id = p_delivery_id;
end;
$$;

revoke all
on function
public.retry_safe_date_push_delivery(
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function
public.retry_safe_date_push_delivery(
  uuid,
  text
)
to service_role;


create or replace function
public.get_safe_date_push_receipts(
  p_limit integer default 100
)
returns table (
  delivery_id uuid,
  push_device_id uuid,
  provider_ticket_id text
)
language sql
security definer
set search_path = ''
as $$
  select
    d.id,
    d.push_device_id,
    d.provider_ticket_id
  from public.safe_date_push_deliveries d
  where d.status = 'ticketed'
    and d.provider_ticket_id is not null
    and d.ticketed_at
      <= now() - interval '15 minutes'
    and d.ticketed_at
      >= now() - interval '24 hours'
  order by d.ticketed_at
  limit greatest(
    1,
    least(
      coalesce(p_limit, 100),
      1000
    )
  );
$$;

revoke all
on function
public.get_safe_date_push_receipts(integer)
from public, anon, authenticated;

grant execute
on function
public.get_safe_date_push_receipts(integer)
to service_role;


create or replace function
public.complete_safe_date_push_receipt(
  p_delivery_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox_id uuid;
begin
  if p_status not in (
    'delivered',
    'failed',
    'device_not_registered'
  ) then
    raise exception
      'Unsupported SafeDate receipt status.';
  end if;

  update public.safe_date_push_deliveries
  set
    status =
      case
        when p_status = 'delivered'
          then 'delivered'
        else 'failed'
      end,

    provider_status = p_status,

    receipt_checked_at = now(),

    delivered_at =
      case
        when p_status = 'delivered'
          then now()
        else null
      end,

    failed_at =
      case
        when p_status = 'delivered'
          then null
        else now()
      end,

    last_error =
      case
        when p_error is null
          then null
        else left(
          p_error,
          500
        )
      end

  where id = p_delivery_id
  returning outbox_id
  into v_outbox_id;

  if p_status =
    'device_not_registered'
  then
    update public.safe_date_push_devices d
    set
      enabled = false,
      disabled_at =
        coalesce(
          d.disabled_at,
          now()
        ),
      updated_at = now()
    where d.id = (
      select pd.push_device_id
      from public.safe_date_push_deliveries pd
      where pd.id =
        p_delivery_id
    );
  end if;

  if v_outbox_id is null then
    return;
  end if;

  update public.safe_date_notification_outbox o
  set
    status =
      case
        when exists (
          select 1
          from public.safe_date_push_deliveries pd
          where pd.outbox_id = o.id
            and pd.status =
              'delivered'
        )
          then 'delivered'

        when exists (
          select 1
          from public.safe_date_push_deliveries pd
          where pd.outbox_id = o.id
            and pd.status in (
              'pending',
              'processing',
              'ticketed'
            )
        )
          then 'processing'

        else 'failed'
      end,

    delivered_at =
      case
        when exists (
          select 1
          from public.safe_date_push_deliveries pd
          where pd.outbox_id = o.id
            and pd.status =
              'delivered'
        )
          then coalesce(
            o.delivered_at,
            now()
          )
        else o.delivered_at
      end,

    failed_at =
      case
        when not exists (
          select 1
          from public.safe_date_push_deliveries pd
          where pd.outbox_id = o.id
            and pd.status in (
              'pending',
              'processing',
              'ticketed',
              'delivered'
            )
        )
          then coalesce(
            o.failed_at,
            now()
          )
        else o.failed_at
      end

  where o.id = v_outbox_id;
end;
$$;

revoke all
on function
public.complete_safe_date_push_receipt(
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function
public.complete_safe_date_push_receipt(
  uuid,
  text,
  text
)
to service_role;


create or replace function
public.set_my_safe_date_trusted_contact_enabled(
  p_date_plan_id uuid,
  p_trusted_contact_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid :=
    auth.uid();

  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception
      'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  if not exists (
    select 1
    from public.safe_date_trusted_contacts tc
    where tc.id =
      p_trusted_contact_id
      and tc.member_id =
        v_member_id
      and tc.revoked_at is null
  ) then
    raise exception
      'Trusted contact not found.';
  end if;

  if p_enabled
    and not exists (
      select 1
      from public.safe_date_trusted_contacts tc
      where tc.id =
        p_trusted_contact_id
        and tc.member_id =
          v_member_id
        and tc.revoked_at is null
        and tc.linked_member_id
          is not null
    )
  then
    raise exception
      'Trusted contact must accept their BTME invite before activation.';
  end if;

  if p_enabled then
    insert into public.safe_date_session_trusted_contacts (
      safe_date_session_id,
      member_id,
      trusted_contact_id,
      enabled_at,
      disabled_at
    )
    values (
      v_session_id,
      v_member_id,
      p_trusted_contact_id,
      now(),
      null
    )
    on conflict (
      safe_date_session_id,
      member_id,
      trusted_contact_id
    )
    do update set
      enabled_at = now(),
      disabled_at = null;

  else
    update public.safe_date_session_trusted_contacts
    set
      disabled_at =
        coalesce(
          disabled_at,
          now()
        )
    where safe_date_session_id =
      v_session_id
      and member_id =
        v_member_id
      and trusted_contact_id =
        p_trusted_contact_id
      and disabled_at is null;
  end if;

  update public.safe_date_member_states
  set
    trusted_contact_enabled =
      exists (
        select 1
        from public.safe_date_session_trusted_contacts stc
        join public.safe_date_trusted_contacts tc
          on tc.id =
            stc.trusted_contact_id
        where stc.safe_date_session_id =
          v_session_id
          and stc.member_id =
            v_member_id
          and stc.disabled_at is null
          and tc.revoked_at is null
          and tc.linked_member_id
            is not null
      )
  where safe_date_session_id =
    v_session_id
    and member_id =
      v_member_id;
end;
$$;

revoke all
on function
public.set_my_safe_date_trusted_contact_enabled(
  uuid,
  uuid,
  boolean
)
from public, anon;

grant execute
on function
public.set_my_safe_date_trusted_contact_enabled(
  uuid,
  uuid,
  boolean
)
to authenticated;


update public.safe_date_session_trusted_contacts stc
set
  disabled_at =
    coalesce(
      stc.disabled_at,
      now()
    )
where stc.disabled_at is null
  and not exists (
    select 1
    from public.safe_date_trusted_contacts tc
    where tc.id =
      stc.trusted_contact_id
      and tc.revoked_at is null
      and tc.linked_member_id
        is not null
  );


update public.safe_date_member_states s
set
  trusted_contact_enabled =
    exists (
      select 1
      from public.safe_date_session_trusted_contacts stc
      join public.safe_date_trusted_contacts tc
        on tc.id =
          stc.trusted_contact_id
      where stc.safe_date_session_id =
        s.safe_date_session_id
        and stc.member_id =
          s.member_id
        and stc.disabled_at is null
        and tc.revoked_at is null
        and tc.linked_member_id
          is not null
    );


select cron.schedule(
  'safedate-push-delivery',
  '* * * * *',
  $cron$
    select net.http_post(
      url :=
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name =
            'safedate_project_url'
        )
        ||
        '/functions/v1/safe-date-notification-delivery',

      headers :=
        jsonb_build_object(
          'Content-Type',
          'application/json',

          'Authorization',
          'Bearer '
          ||
          (
            select decrypted_secret
            from vault.decrypted_secrets
            where name =
              'safedate_anon_key'
          )
        ),

      body :=
        '{}'::jsonb,

      timeout_milliseconds :=
        10000
    );
  $cron$
);

commit;
