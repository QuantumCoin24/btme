create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  member_id uuid primary key references public.members(id) on delete cascade,
  first_name text,
  birth_date date,
  city text,
  bio text,
  profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_first_name_length
    check (first_name is null or char_length(first_name) between 1 and 80),
  constraint profiles_city_length
    check (city is null or char_length(city) <= 120),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 1000)
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  storage_path text not null,
  position smallint not null
    check (position between 1 and 6),
  is_hero boolean not null default false,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_photos_storage_path_length
    check (char_length(storage_path) between 1 and 500),
  unique (member_id, position)
);

create unique index profile_photos_one_hero_per_member
  on public.profile_photos(member_id)
  where is_hero = true;

create table public.member_preferences (
  member_id uuid primary key references public.members(id) on delete cascade,
  relationship_intent text
    check (
      relationship_intent is null
      or relationship_intent in (
        'relationship',
        'life-partner',
        'intentional-dating',
        'open-genuine'
      )
    ),
  looking_for text[] not null default '{}',
  minimum_age smallint not null default 25
    check (minimum_age between 18 and 120),
  maximum_age smallint not null default 40
    check (maximum_age between 18 and 120),
  distance_km integer not null default 40
    check (distance_km between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_preferences_age_range
    check (minimum_age <= maximum_age),
  constraint member_preferences_looking_for_count
    check (cardinality(looking_for) <= 20)
);

create table public.compatibility_profiles (
  member_id uuid primary key references public.members(id) on delete cascade,
  lifestyle_signals text[] not null default '{}',
  perfect_sunday text,
  green_flag text,
  absolute_no text,
  chemistry_style text,
  deal_breakers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compatibility_lifestyle_count
    check (cardinality(lifestyle_signals) <= 30),
  constraint compatibility_deal_breaker_count
    check (cardinality(deal_breakers) <= 30),
  constraint compatibility_perfect_sunday_length
    check (perfect_sunday is null or char_length(perfect_sunday) <= 1000),
  constraint compatibility_green_flag_length
    check (green_flag is null or char_length(green_flag) <= 1000),
  constraint compatibility_absolute_no_length
    check (absolute_no is null or char_length(absolute_no) <= 1000),
  constraint compatibility_chemistry_style_length
    check (chemistry_style is null or char_length(chemistry_style) <= 100)
);

create table public.member_decisions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.members(id) on delete cascade,
  target_id uuid not null references public.members(id) on delete cascade,
  decision text not null
    check (decision in ('like', 'pass')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_decisions_not_self
    check (actor_id <> target_id),
  unique (actor_id, target_id)
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  member_one_id uuid not null references public.members(id) on delete cascade,
  member_two_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'ended')),
  connected_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint connections_not_self
    check (member_one_id <> member_two_id),
  constraint connections_canonical_order
    check (member_one_id < member_two_id),
  constraint connections_end_state
    check (
      (status = 'active' and ended_at is null)
      or
      (status = 'ended' and ended_at is not null)
    ),
  unique (member_one_id, member_two_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique
    references public.connections(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  member_id uuid not null
    references public.members(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, member_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  sender_id uuid not null
    references public.members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_body_length
    check (char_length(body) between 1 and 4000)
);

create table public.date_plans (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null
    references public.connections(id) on delete cascade,
  created_by uuid not null
    references public.members(id) on delete cascade,
  scheduled_for timestamptz not null,
  place_name text not null,
  status text not null default 'proposed'
    check (
      status in (
        'proposed',
        'accepted',
        'cancelled',
        'completed'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint date_plans_place_length
    check (char_length(place_name) between 1 and 250)
);

create table public.member_blocks (
  blocker_id uuid not null
    references public.members(id) on delete cascade,
  blocked_id uuid not null
    references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint member_blocks_not_self
    check (blocker_id <> blocked_id)
);

create table public.member_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null
    references public.members(id) on delete cascade,
  reported_id uuid not null
    references public.members(id) on delete cascade,
  category text not null,
  details text,
  status text not null default 'submitted'
    check (
      status in (
        'submitted',
        'reviewing',
        'resolved',
        'dismissed'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_reports_not_self
    check (reporter_id <> reported_id),
  constraint member_reports_category_length
    check (char_length(category) between 1 and 100),
  constraint member_reports_details_length
    check (details is null or char_length(details) <= 4000)
);

create index profile_photos_member_id_idx
  on public.profile_photos(member_id);

create index member_decisions_target_id_idx
  on public.member_decisions(target_id);

create index connections_member_one_id_idx
  on public.connections(member_one_id);

create index connections_member_two_id_idx
  on public.connections(member_two_id);

create index conversation_members_member_id_idx
  on public.conversation_members(member_id);

create index messages_conversation_created_at_idx
  on public.messages(conversation_id, created_at);

create index messages_sender_id_idx
  on public.messages(sender_id);

create index date_plans_connection_id_idx
  on public.date_plans(connection_id);

create index date_plans_created_by_idx
  on public.date_plans(created_by);

create index member_blocks_blocked_id_idx
  on public.member_blocks(blocked_id);

create index member_reports_reported_id_idx
  on public.member_reports(reported_id);

create index member_reports_reporter_id_idx
  on public.member_reports(reporter_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_connection_member(
  p_connection_id uuid,
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and (
        c.member_one_id = p_member_id
        or c.member_two_id = p_member_id
      )
  );
$$;

create or replace function private.is_conversation_member(
  p_conversation_id uuid,
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.member_id = p_member_id
  );
$$;

revoke all on function private.is_connection_member(uuid, uuid)
  from public, anon, authenticated;

revoke all on function private.is_conversation_member(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.members (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.profiles (member_id)
  values (new.id)
  on conflict (member_id) do nothing;

  insert into public.member_preferences (member_id)
  values (new.id)
  on conflict (member_id) do nothing;

  insert into public.compatibility_profiles (member_id)
  values (new.id)
  on conflict (member_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

create trigger members_set_updated_at
before update on public.members
for each row
execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

create trigger profile_photos_set_updated_at
before update on public.profile_photos
for each row
execute function private.set_updated_at();

create trigger member_preferences_set_updated_at
before update on public.member_preferences
for each row
execute function private.set_updated_at();

create trigger compatibility_profiles_set_updated_at
before update on public.compatibility_profiles
for each row
execute function private.set_updated_at();

create trigger member_decisions_set_updated_at
before update on public.member_decisions
for each row
execute function private.set_updated_at();

create trigger connections_set_updated_at
before update on public.connections
for each row
execute function private.set_updated_at();

create trigger date_plans_set_updated_at
before update on public.date_plans
for each row
execute function private.set_updated_at();

create trigger member_reports_set_updated_at
before update on public.member_reports
for each row
execute function private.set_updated_at();

alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.member_preferences enable row level security;
alter table public.compatibility_profiles enable row level security;
alter table public.member_decisions enable row level security;
alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.date_plans enable row level security;
alter table public.member_blocks enable row level security;
alter table public.member_reports enable row level security;

revoke all on table public.members from anon;
revoke all on table public.profiles from anon;
revoke all on table public.profile_photos from anon;
revoke all on table public.member_preferences from anon;
revoke all on table public.compatibility_profiles from anon;
revoke all on table public.member_decisions from anon;
revoke all on table public.connections from anon;
revoke all on table public.conversations from anon;
revoke all on table public.conversation_members from anon;
revoke all on table public.messages from anon;
revoke all on table public.date_plans from anon;
revoke all on table public.member_blocks from anon;
revoke all on table public.member_reports from anon;

grant select on table public.members to authenticated;

grant select, update
  on table public.profiles
  to authenticated;

grant select, insert, update, delete
  on table public.profile_photos
  to authenticated;

grant select, update
  on table public.member_preferences
  to authenticated;

grant select, update
  on table public.compatibility_profiles
  to authenticated;

grant select, insert, update
  on table public.member_decisions
  to authenticated;

grant select
  on table public.connections
  to authenticated;

grant select
  on table public.conversations
  to authenticated;

grant select
  on table public.conversation_members
  to authenticated;

grant select, insert
  on table public.messages
  to authenticated;

grant select, insert, update
  on table public.date_plans
  to authenticated;

grant select, insert, delete
  on table public.member_blocks
  to authenticated;

grant select, insert
  on table public.member_reports
  to authenticated;

create policy members_select_self
on public.members
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_select_self
on public.profiles
for select
to authenticated
using ((select auth.uid()) = member_id);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using ((select auth.uid()) = member_id)
with check ((select auth.uid()) = member_id);

create policy profile_photos_select_self
on public.profile_photos
for select
to authenticated
using ((select auth.uid()) = member_id);

create policy profile_photos_insert_self
on public.profile_photos
for insert
to authenticated
with check ((select auth.uid()) = member_id);

create policy profile_photos_update_self
on public.profile_photos
for update
to authenticated
using ((select auth.uid()) = member_id)
with check ((select auth.uid()) = member_id);

create policy profile_photos_delete_self
on public.profile_photos
for delete
to authenticated
using ((select auth.uid()) = member_id);

create policy member_preferences_select_self
on public.member_preferences
for select
to authenticated
using ((select auth.uid()) = member_id);

create policy member_preferences_update_self
on public.member_preferences
for update
to authenticated
using ((select auth.uid()) = member_id)
with check ((select auth.uid()) = member_id);

create policy compatibility_profiles_select_self
on public.compatibility_profiles
for select
to authenticated
using ((select auth.uid()) = member_id);

create policy compatibility_profiles_update_self
on public.compatibility_profiles
for update
to authenticated
using ((select auth.uid()) = member_id)
with check ((select auth.uid()) = member_id);

create policy member_decisions_select_self
on public.member_decisions
for select
to authenticated
using ((select auth.uid()) = actor_id);

create policy member_decisions_insert_self
on public.member_decisions
for insert
to authenticated
with check (
  (select auth.uid()) = actor_id
  and actor_id <> target_id
);

create policy member_decisions_update_self
on public.member_decisions
for update
to authenticated
using ((select auth.uid()) = actor_id)
with check (
  (select auth.uid()) = actor_id
  and actor_id <> target_id
);

create policy connections_select_participant
on public.connections
for select
to authenticated
using (
  (select auth.uid()) = member_one_id
  or (select auth.uid()) = member_two_id
);

create policy conversations_select_participant
on public.conversations
for select
to authenticated
using (
  private.is_connection_member(
    connection_id,
    (select auth.uid())
  )
);

create policy conversation_members_select_participant
on public.conversation_members
for select
to authenticated
using (
  private.is_conversation_member(
    conversation_id,
    (select auth.uid())
  )
);

create policy messages_select_participant
on public.messages
for select
to authenticated
using (
  private.is_conversation_member(
    conversation_id,
    (select auth.uid())
  )
);

create policy messages_insert_participant
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_conversation_member(
    conversation_id,
    (select auth.uid())
  )
);

create policy date_plans_select_participant
on public.date_plans
for select
to authenticated
using (
  private.is_connection_member(
    connection_id,
    (select auth.uid())
  )
);

create policy date_plans_insert_participant
on public.date_plans
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_connection_member(
    connection_id,
    (select auth.uid())
  )
);

create policy date_plans_update_creator
on public.date_plans
for update
to authenticated
using (
  created_by = (select auth.uid())
  and private.is_connection_member(
    connection_id,
    (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and private.is_connection_member(
    connection_id,
    (select auth.uid())
  )
);

create policy member_blocks_select_self
on public.member_blocks
for select
to authenticated
using ((select auth.uid()) = blocker_id);

create policy member_blocks_insert_self
on public.member_blocks
for insert
to authenticated
with check (
  (select auth.uid()) = blocker_id
  and blocker_id <> blocked_id
);

create policy member_blocks_delete_self
on public.member_blocks
for delete
to authenticated
using ((select auth.uid()) = blocker_id);

create policy member_reports_select_self
on public.member_reports
for select
to authenticated
using ((select auth.uid()) = reporter_id);

create policy member_reports_insert_self
on public.member_reports
for insert
to authenticated
with check (
  (select auth.uid()) = reporter_id
  and reporter_id <> reported_id
);
