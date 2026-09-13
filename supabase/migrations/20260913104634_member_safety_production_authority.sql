begin;

-- BTME Safety Centre production authority.
--
-- Reuses the production tables that already exist:
--   public.member_blocks(blocker_id, blocked_id, created_at)
--   public.member_reports(
--     id,
--     reporter_id,
--     reported_id,
--     category,
--     details,
--     status,
--     created_at,
--     updated_at
--   )
--
-- Adds only the missing connection context, RPC authority and
-- database-boundary messaging enforcement.

alter table public.member_reports
  add column if not exists connection_id uuid
  references public.connections(id)
  on delete set null;

create index if not exists
  member_reports_connection_id_idx
on public.member_reports(connection_id)
where connection_id is not null;


create or replace function private.other_connection_member(
  p_connection_id uuid,
  p_actor_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_one uuid;
  v_member_two uuid;
begin
  if p_connection_id is null
     or p_actor_member_id is null then
    raise exception 'Connection is required.';
  end if;

  select
    c.member_one_id,
    c.member_two_id
  into
    v_member_one,
    v_member_two
  from public.connections c
  where c.id = p_connection_id;

  if not found then
    raise exception 'Connection not found.';
  end if;

  if p_actor_member_id = v_member_one then
    return v_member_two;
  end if;

  if p_actor_member_id = v_member_two then
    return v_member_one;
  end if;

  raise exception 'You are not a member of this connection.';
end;
$$;


create or replace function private.members_are_blocked(
  p_member_one uuid,
  p_member_two uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.member_blocks b
    where
      (
        b.blocker_id = p_member_one
        and b.blocked_id = p_member_two
      )
      or
      (
        b.blocker_id = p_member_two
        and b.blocked_id = p_member_one
      )
  );
$$;


create or replace function public.block_connection_member(
  p_connection_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  v_target :=
    private.other_connection_member(
      p_connection_id,
      v_actor
    );

  insert into public.member_blocks (
    blocker_id,
    blocked_id
  )
  values (
    v_actor,
    v_target
  )
  on conflict (
    blocker_id,
    blocked_id
  )
  do nothing;

  return true;
end;
$$;


create or replace function public.unblock_connection_member(
  p_connection_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
  v_deleted integer;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  v_target :=
    private.other_connection_member(
      p_connection_id,
      v_actor
    );

  delete from public.member_blocks
  where blocker_id = v_actor
    and blocked_id = v_target;

  get diagnostics v_deleted = row_count;

  return v_deleted > 0;
end;
$$;


create or replace function public.report_connection_member(
  p_connection_id uuid,
  p_category text,
  p_narrative text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
  v_category text :=
    btrim(coalesce(p_category, ''));
  v_details text :=
    btrim(coalesce(p_narrative, ''));
  v_report_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  if v_category = '' then
    v_category := 'other';
  end if;

  if char_length(v_category) > 100 then
    raise exception 'Report category is too long.';
  end if;

  if char_length(v_details) < 1 then
    raise exception 'Write a report before submitting.';
  end if;

  if char_length(v_details) > 4000 then
    raise exception 'Reports can be up to 4,000 characters.';
  end if;

  v_target :=
    private.other_connection_member(
      p_connection_id,
      v_actor
    );

  insert into public.member_reports (
    reporter_id,
    reported_id,
    category,
    details,
    status,
    connection_id
  )
  values (
    v_actor,
    v_target,
    v_category,
    v_details,
    'submitted',
    p_connection_id
  )
  returning id
  into v_report_id;

  return v_report_id;
end;
$$;


create or replace function public.get_my_connection_safety_state(
  p_connection_id uuid
)
returns table (
  connection_id uuid,
  i_blocked boolean,
  report_count bigint,
  latest_report_id uuid,
  latest_report_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  v_target :=
    private.other_connection_member(
      p_connection_id,
      v_actor
    );

  return query
  select
    p_connection_id,
    exists (
      select 1
      from public.member_blocks b
      where b.blocker_id = v_actor
        and b.blocked_id = v_target
    ),
    (
      select count(*)
      from public.member_reports r
      where r.reporter_id = v_actor
        and r.reported_id = v_target
    ),
    (
      select r.id
      from public.member_reports r
      where r.reporter_id = v_actor
        and r.reported_id = v_target
      order by r.created_at desc
      limit 1
    ),
    (
      select r.created_at
      from public.member_reports r
      where r.reporter_id = v_actor
        and r.reported_id = v_target
      order by r.created_at desc
      limit 1
    );
end;
$$;


create or replace function private.enforce_message_member_safety()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_id uuid;
  v_member_one uuid;
  v_member_two uuid;
  v_other uuid;
begin
  select
    conv.connection_id
  into
    v_connection_id
  from public.conversations conv
  where conv.id = new.conversation_id;

  if v_connection_id is null then
    raise exception 'Conversation is unavailable.';
  end if;

  select
    c.member_one_id,
    c.member_two_id
  into
    v_member_one,
    v_member_two
  from public.connections c
  where c.id = v_connection_id;

  if not found then
    raise exception 'Connection is unavailable.';
  end if;

  if new.sender_id = v_member_one then
    v_other := v_member_two;
  elsif new.sender_id = v_member_two then
    v_other := v_member_one;
  else
    raise exception 'Sender is not part of this connection.';
  end if;

  if private.members_are_blocked(
    new.sender_id,
    v_other
  ) then
    raise exception
      'Messaging is unavailable for this connection.';
  end if;

  return new;
end;
$$;


drop trigger if exists
  messages_member_safety_enforcement
on public.messages;

create trigger
  messages_member_safety_enforcement
before insert
on public.messages
for each row
execute function private.enforce_message_member_safety();


-- Existing discovery already honours public.member_blocks in
-- both directions. This migration therefore reuses that
-- production exclusion path rather than duplicating it.


-- Remove direct authenticated mutation authority.
-- Safety writes must pass through RPC boundaries.

drop policy if exists
  member_blocks_insert_self
on public.member_blocks;

drop policy if exists
  member_blocks_delete_self
on public.member_blocks;

drop policy if exists
  member_reports_insert_self
on public.member_reports;


revoke insert, update, delete
on public.member_blocks
from authenticated;

revoke insert, update, delete
on public.member_reports
from authenticated;


-- Preserve member-owned read authority.
-- Existing SELECT policies remain in force.


revoke all
on function private.other_connection_member(uuid, uuid)
from public, anon, authenticated;

revoke all
on function private.members_are_blocked(uuid, uuid)
from public, anon, authenticated;

revoke all
on function private.enforce_message_member_safety()
from public, anon, authenticated;


revoke all
on function public.block_connection_member(uuid)
from public, anon;

revoke all
on function public.unblock_connection_member(uuid)
from public, anon;

revoke all
on function public.report_connection_member(uuid, text, text)
from public, anon;

revoke all
on function public.get_my_connection_safety_state(uuid)
from public, anon;


grant execute
on function public.block_connection_member(uuid)
to authenticated;

grant execute
on function public.unblock_connection_member(uuid)
to authenticated;

grant execute
on function public.report_connection_member(uuid, text, text)
to authenticated;

grant execute
on function public.get_my_connection_safety_state(uuid)
to authenticated;

commit;
