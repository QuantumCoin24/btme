begin;

alter table public.safe_date_trusted_contacts
  add column if not exists linked_member_id uuid,
  add column if not exists linked_at timestamptz;

alter table public.safe_date_trusted_contacts
  drop constraint if exists safe_date_trusted_contacts_linked_member_id_fkey;

alter table public.safe_date_trusted_contacts
  add constraint safe_date_trusted_contacts_linked_member_id_fkey
  foreign key (linked_member_id)
  references public.members(id)
  on delete set null;

create table if not exists public.safe_date_trusted_contact_invites (
  token uuid primary key default gen_random_uuid(),
  trusted_contact_id uuid not null
    references public.safe_date_trusted_contacts(id)
    on delete cascade,
  owner_member_id uuid not null
    references public.members(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by_member_id uuid
    references public.members(id)
    on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint safe_date_trusted_contact_invites_expiry_check
    check (expires_at > created_at)
);

create index if not exists
  safe_date_trusted_contact_invites_contact_idx
on public.safe_date_trusted_contact_invites(
  trusted_contact_id,
  created_at desc
);

alter table public.safe_date_trusted_contact_invites
enable row level security;

revoke all
on table public.safe_date_trusted_contact_invites
from public, anon, authenticated;

create table if not exists public.safe_date_push_devices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null
    references public.members(id)
    on delete cascade,
  expo_push_token text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint safe_date_push_devices_token_check
    check (
      length(trim(expo_push_token)) between 20 and 512
    )
);

create unique index if not exists
  safe_date_push_devices_token_uidx
on public.safe_date_push_devices(expo_push_token);

create index if not exists
  safe_date_push_devices_member_idx
on public.safe_date_push_devices(member_id)
where enabled = true;

alter table public.safe_date_push_devices
enable row level security;

revoke all
on table public.safe_date_push_devices
from public, anon, authenticated;

alter table public.safe_date_notification_outbox
  add column if not exists delivery_channel text,
  add column if not exists destination_member_id uuid,
  add column if not exists provider_ticket_id text,
  add column if not exists provider_status text,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_error text;

alter table public.safe_date_notification_outbox
  drop constraint if exists safe_date_notification_outbox_destination_member_fkey;

alter table public.safe_date_notification_outbox
  add constraint safe_date_notification_outbox_destination_member_fkey
  foreign key (destination_member_id)
  references public.members(id)
  on delete set null;

alter table public.safe_date_notification_outbox
  drop constraint if exists safe_date_notification_outbox_delivery_channel_check;

alter table public.safe_date_notification_outbox
  add constraint safe_date_notification_outbox_delivery_channel_check
  check (
    delivery_channel is null
    or delivery_channel in ('expo_push')
  );

create or replace function
public.register_my_safe_date_push_token(
  p_expo_push_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_token text := trim(p_expo_push_token);
begin
  select m.id
  into v_member_id
  from public.members m
  where m.auth_user_id = auth.uid();

  if v_member_id is null then
    raise exception 'Member profile not found.';
  end if;

  if length(v_token) < 20
     or length(v_token) > 512 then
    raise exception 'Invalid push token.';
  end if;

  insert into public.safe_date_push_devices (
    member_id,
    expo_push_token,
    enabled,
    disabled_at,
    updated_at
  )
  values (
    v_member_id,
    v_token,
    true,
    null,
    now()
  )
  on conflict (expo_push_token)
  do update
  set
    member_id = excluded.member_id,
    enabled = true,
    disabled_at = null,
    updated_at = now();
end;
$$;

revoke all
on function
public.register_my_safe_date_push_token(text)
from public, anon;

grant execute
on function
public.register_my_safe_date_push_token(text)
to authenticated;

create or replace function
public.disable_my_safe_date_push_tokens()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  select m.id
  into v_member_id
  from public.members m
  where m.auth_user_id = auth.uid();

  if v_member_id is null then
    return;
  end if;

  update public.safe_date_push_devices
  set
    enabled = false,
    disabled_at = coalesce(disabled_at, now()),
    updated_at = now()
  where member_id = v_member_id
    and enabled = true;
end;
$$;

revoke all
on function
public.disable_my_safe_date_push_tokens()
from public, anon;

grant execute
on function
public.disable_my_safe_date_push_tokens()
to authenticated;

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
  select m.id
  into v_member_id
  from public.members m
  where m.auth_user_id = auth.uid();

  if v_member_id is null then
    raise exception 'Member profile not found.';
  end if;

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
  select m.id
  into v_member_id
  from public.members m
  where m.auth_user_id = auth.uid();

  if v_member_id is null then
    raise exception 'Member profile not found.';
  end if;

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
    raise exception 'You cannot accept your own trusted contact invite.';
  end if;

  if v_invite.accepted_at is not null
     and v_invite.accepted_by_member_id <> v_member_id then
    raise exception 'Trusted contact invite has already been accepted.';
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
  select m.id
  into v_member_id
  from public.members m
  where m.auth_user_id = auth.uid();

  if v_member_id is null then
    raise exception 'Member profile not found.';
  end if;

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

commit;
