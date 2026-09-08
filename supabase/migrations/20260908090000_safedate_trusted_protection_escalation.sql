-- SafeDate Trusted Protection + Escalation Intelligence

create table public.safe_date_trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint safe_date_trusted_contacts_name_check
    check (char_length(trim(name)) between 1 and 120),
  constraint safe_date_trusted_contacts_contact_check
    check (
      nullif(trim(coalesce(phone, '')), '') is not null
      or nullif(trim(coalesce(email, '')), '') is not null
    )
);

create index safe_date_trusted_contacts_member_idx
on public.safe_date_trusted_contacts(member_id, created_at desc);

alter table public.safe_date_trusted_contacts
enable row level security;

revoke all
on table public.safe_date_trusted_contacts
from public, anon, authenticated;


create table public.safe_date_session_trusted_contacts (
  safe_date_session_id uuid not null
    references public.safe_date_sessions(id)
    on delete cascade,

  member_id uuid not null
    references auth.users(id)
    on delete cascade,

  trusted_contact_id uuid not null
    references public.safe_date_trusted_contacts(id)
    on delete cascade,

  enabled_at timestamptz not null default now(),
  disabled_at timestamptz,

  primary key (
    safe_date_session_id,
    member_id,
    trusted_contact_id
  )
);

create index safe_date_session_trusted_contacts_member_idx
on public.safe_date_session_trusted_contacts(
  safe_date_session_id,
  member_id
);

alter table public.safe_date_session_trusted_contacts
enable row level security;

revoke all
on table public.safe_date_session_trusted_contacts
from public, anon, authenticated;


create table public.safe_date_escalations (
  id uuid primary key default gen_random_uuid(),

  safe_date_session_id uuid not null
    references public.safe_date_sessions(id)
    on delete cascade,

  member_id uuid not null
    references auth.users(id)
    on delete cascade,

  escalation_type text not null,

  source_event_id uuid
    references public.safe_date_safety_events(id)
    on delete set null,

  status text not null default 'active',

  opened_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  cancelled_at timestamptz,

  resolution_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint safe_date_escalations_type_check
    check (
      escalation_type in (
        'missed_check_in',
        'assistance_requested'
      )
    ),

  constraint safe_date_escalations_status_check
    check (
      status in (
        'active',
        'acknowledged',
        'resolved',
        'cancelled'
      )
    )
);

create index safe_date_escalations_session_member_idx
on public.safe_date_escalations(
  safe_date_session_id,
  member_id,
  opened_at desc
);

create unique index safe_date_escalations_active_uidx
on public.safe_date_escalations(
  safe_date_session_id,
  member_id,
  escalation_type
)
where status in ('active', 'acknowledged');

alter table public.safe_date_escalations
enable row level security;

revoke all
on table public.safe_date_escalations
from public, anon, authenticated;


create table public.safe_date_notification_outbox (
  id uuid primary key default gen_random_uuid(),

  safe_date_session_id uuid
    references public.safe_date_sessions(id)
    on delete cascade,

  member_id uuid
    references auth.users(id)
    on delete cascade,

  trusted_contact_id uuid
    references public.safe_date_trusted_contacts(id)
    on delete set null,

  escalation_id uuid
    references public.safe_date_escalations(id)
    on delete cascade,

  notification_type text not null,

  payload jsonb not null default '{}'::jsonb,

  status text not null default 'pending',

  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  failed_at timestamptz,

  attempt_count integer not null default 0,

  created_at timestamptz not null default now(),

  constraint safe_date_notification_outbox_payload_object_check
    check (jsonb_typeof(payload) = 'object'),

  constraint safe_date_notification_outbox_no_coordinates_check
    check (
      not (payload ? 'latitude')
      and not (payload ? 'longitude')
      and not (payload ? 'coordinates')
      and not (payload ? 'location')
    ),

  constraint safe_date_notification_outbox_type_check
    check (
      notification_type in (
        'check_in_missed',
        'assistance_requested',
        'escalation_recovered'
      )
    ),

  constraint safe_date_notification_outbox_status_check
    check (
      status in (
        'pending',
        'processing',
        'delivered',
        'failed'
      )
    )
);

create index safe_date_notification_outbox_pending_idx
on public.safe_date_notification_outbox(
  status,
  available_at
);

alter table public.safe_date_notification_outbox
enable row level security;

revoke all
on table public.safe_date_notification_outbox
from public, anon, authenticated;


create or replace function public.get_my_safe_date_trusted_contacts()
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  created_at timestamptz
)
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

  return query
  select
    tc.id,
    tc.name,
    tc.phone,
    tc.email,
    tc.created_at
  from public.safe_date_trusted_contacts tc
  where tc.member_id = v_member_id
    and tc.revoked_at is null
  order by tc.created_at desc;
end;
$$;

revoke all
on function public.get_my_safe_date_trusted_contacts()
from public, anon;

grant execute
on function public.get_my_safe_date_trusted_contacts()
to authenticated;


create or replace function public.add_my_safe_date_trusted_contact(
  p_name text,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_contact_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if char_length(v_name) < 1
     or char_length(v_name) > 120 then
    raise exception 'Trusted contact name is invalid.';
  end if;

  if v_phone is null
     and v_email is null then
    raise exception 'Trusted contact phone or email is required.';
  end if;

  insert into public.safe_date_trusted_contacts (
    member_id,
    name,
    phone,
    email
  )
  values (
    v_member_id,
    v_name,
    v_phone,
    v_email
  )
  returning id into v_contact_id;

  return v_contact_id;
end;
$$;

revoke all
on function public.add_my_safe_date_trusted_contact(text, text, text)
from public, anon;

grant execute
on function public.add_my_safe_date_trusted_contact(text, text, text)
to authenticated;


create or replace function public.revoke_my_safe_date_trusted_contact(
  p_trusted_contact_id uuid
)
returns void
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

  update public.safe_date_trusted_contacts
  set revoked_at = coalesce(revoked_at, now())
  where id = p_trusted_contact_id
    and member_id = v_member_id;

  if not found then
    raise exception 'Trusted contact not found.';
  end if;

  update public.safe_date_session_trusted_contacts
  set disabled_at = coalesce(disabled_at, now())
  where trusted_contact_id = p_trusted_contact_id
    and member_id = v_member_id
    and disabled_at is null;
end;
$$;

revoke all
on function public.revoke_my_safe_date_trusted_contact(uuid)
from public, anon;

grant execute
on function public.revoke_my_safe_date_trusted_contact(uuid)
to authenticated;


create or replace function public.set_my_safe_date_trusted_contact_enabled(
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
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  if not exists (
    select 1
    from public.safe_date_trusted_contacts tc
    where tc.id = p_trusted_contact_id
      and tc.member_id = v_member_id
      and tc.revoked_at is null
  ) then
    raise exception 'Trusted contact not found.';
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
    set disabled_at = coalesce(disabled_at, now())
    where safe_date_session_id = v_session_id
      and member_id = v_member_id
      and trusted_contact_id = p_trusted_contact_id
      and disabled_at is null;
  end if;

  update public.safe_date_member_states
  set trusted_contact_enabled =
    exists (
      select 1
      from public.safe_date_session_trusted_contacts stc
      join public.safe_date_trusted_contacts tc
        on tc.id = stc.trusted_contact_id
      where stc.safe_date_session_id = v_session_id
        and stc.member_id = v_member_id
        and stc.disabled_at is null
        and tc.revoked_at is null
    )
  where safe_date_session_id = v_session_id
    and member_id = v_member_id;
end;
$$;

revoke all
on function public.set_my_safe_date_trusted_contact_enabled(
  uuid,
  uuid,
  boolean
)
from public, anon;

grant execute
on function public.set_my_safe_date_trusted_contact_enabled(
  uuid,
  uuid,
  boolean
)
to authenticated;


create or replace function public.get_my_safe_date_active_trusted_contacts(
  p_date_plan_id uuid
)
returns table (
  trusted_contact_id uuid,
  name text,
  phone text,
  email text,
  enabled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  return query
  select
    tc.id,
    tc.name,
    tc.phone,
    tc.email,
    stc.enabled_at
  from public.safe_date_session_trusted_contacts stc
  join public.safe_date_trusted_contacts tc
    on tc.id = stc.trusted_contact_id
  where stc.safe_date_session_id = v_session_id
    and stc.member_id = v_member_id
    and stc.disabled_at is null
    and tc.revoked_at is null
  order by stc.enabled_at desc;
end;
$$;

revoke all
on function public.get_my_safe_date_active_trusted_contacts(uuid)
from public, anon;

grant execute
on function public.get_my_safe_date_active_trusted_contacts(uuid)
to authenticated;


create or replace function private.create_safe_date_escalation(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_escalation_type text,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_escalation_id uuid;
  v_contact record;
begin
  if p_escalation_type not in (
    'missed_check_in',
    'assistance_requested'
  ) then
    raise exception 'Unsupported SafeDate escalation type.';
  end if;

  select e.id
  into v_escalation_id
  from public.safe_date_escalations e
  where e.safe_date_session_id = p_safe_date_session_id
    and e.member_id = p_member_id
    and e.escalation_type = p_escalation_type
    and e.status in ('active', 'acknowledged')
  order by e.opened_at desc
  limit 1;

  if v_escalation_id is not null then
    return v_escalation_id;
  end if;

  insert into public.safe_date_escalations (
    safe_date_session_id,
    member_id,
    escalation_type,
    source_event_id
  )
  values (
    p_safe_date_session_id,
    p_member_id,
    p_escalation_type,
    p_source_event_id
  )
  returning id into v_escalation_id;

  for v_contact in
    select stc.trusted_contact_id
    from public.safe_date_session_trusted_contacts stc
    join public.safe_date_trusted_contacts tc
      on tc.id = stc.trusted_contact_id
    where stc.safe_date_session_id = p_safe_date_session_id
      and stc.member_id = p_member_id
      and stc.disabled_at is null
      and tc.revoked_at is null
  loop
    insert into public.safe_date_notification_outbox (
      safe_date_session_id,
      member_id,
      trusted_contact_id,
      escalation_id,
      notification_type,
      payload
    )
    values (
      p_safe_date_session_id,
      p_member_id,
      v_contact.trusted_contact_id,
      v_escalation_id,
      case
        when p_escalation_type = 'missed_check_in'
          then 'check_in_missed'
        else 'assistance_requested'
      end,
      jsonb_build_object(
        'escalation_type',
        p_escalation_type
      )
    );
  end loop;

  return v_escalation_id;
end;
$$;

revoke all
on function private.create_safe_date_escalation(
  uuid,
  uuid,
  text,
  uuid
)
from public, anon, authenticated;


create or replace function private.resolve_safe_date_escalations(
  p_safe_date_session_id uuid,
  p_member_id uuid,
  p_escalation_type text,
  p_resolution_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_escalation_type not in (
    'missed_check_in',
    'assistance_requested'
  ) then
    raise exception 'Unsupported SafeDate escalation type.';
  end if;

  with resolved as (
    update public.safe_date_escalations
    set
      status = 'resolved',
      resolved_at = now(),
      resolution_reason = p_resolution_reason,
      updated_at = now()
    where safe_date_session_id = p_safe_date_session_id
      and member_id = p_member_id
      and escalation_type = p_escalation_type
      and status in ('active', 'acknowledged')
    returning
      id,
      safe_date_session_id,
      member_id
  ),
  queued as (
    insert into public.safe_date_notification_outbox (
      safe_date_session_id,
      member_id,
      escalation_id,
      notification_type,
      payload
    )
    select
      r.safe_date_session_id,
      r.member_id,
      r.id,
      'escalation_recovered',
      jsonb_build_object(
        'escalation_type',
        p_escalation_type,
        'reason',
        p_resolution_reason
      )
    from resolved r
    returning 1
  )
  select count(*)
  into v_count
  from queued;

  return v_count;
end;
$$;

revoke all
on function private.resolve_safe_date_escalations(
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated;


create or replace function private.process_safe_date_escalations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
  v_created integer := 0;
begin
  for v_event in
    select e.*
    from public.safe_date_safety_events e
    where e.event_type in (
      'check_in_missed',
      'assistance_requested'
    )
      and not exists (
        select 1
        from public.safe_date_escalations se
        where se.source_event_id = e.id
      )
    order by e.occurred_at
  loop
    perform private.create_safe_date_escalation(
      v_event.safe_date_session_id,
      v_event.member_id,
      case
        when v_event.event_type = 'check_in_missed'
          then 'missed_check_in'
        else 'assistance_requested'
      end,
      v_event.id
    );

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object(
    'processed_events',
    v_created,
    'completed_at',
    now()
  );
end;
$$;

revoke all
on function private.process_safe_date_escalations()
from public, anon, authenticated;


create or replace function private.audit_safe_date_recovery_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if
    old.last_check_in_at
      is distinct from new.last_check_in_at
    and new.last_check_in_at is not null
  then
    perform private.resolve_safe_date_escalations(
      new.safe_date_session_id,
      new.member_id,
      'missed_check_in',
      'member_checked_in'
    );
  end if;

  if
    old.assistance_cleared_at
      is distinct from new.assistance_cleared_at
    and new.assistance_cleared_at is not null
  then
    perform private.resolve_safe_date_escalations(
      new.safe_date_session_id,
      new.member_id,
      'assistance_requested',
      'assistance_cleared'
    );
  end if;

  if
    old.safe_arrival_confirmed_at
      is distinct from new.safe_arrival_confirmed_at
    and new.safe_arrival_confirmed_at is not null
  then
    perform private.resolve_safe_date_escalations(
      new.safe_date_session_id,
      new.member_id,
      'missed_check_in',
      'safe_arrival_confirmed'
    );
  end if;

  return new;
end;
$$;

revoke all
on function private.audit_safe_date_recovery_events()
from public, anon, authenticated;

drop trigger if exists
safe_date_member_states_escalation_recovery
on public.safe_date_member_states;

create trigger safe_date_member_states_escalation_recovery
after update
on public.safe_date_member_states
for each row
execute function private.audit_safe_date_recovery_events();


create or replace function private.safe_date_intelligence_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missed_check_ins integer;
  v_expired_consents integer;
  v_deleted_locations integer;
  v_escalation_result jsonb;
begin
  v_missed_check_ins :=
    private.record_due_safe_date_check_ins(now());

  v_expired_consents :=
    private.expire_safe_date_location_consents();

  v_deleted_locations :=
    private.purge_expired_safe_date_locations(
      interval '24 hours'
    );

  v_escalation_result :=
    private.process_safe_date_escalations();

  return jsonb_build_object(
    'recorded_missed_check_ins',
    v_missed_check_ins,
    'expired_location_consents',
    v_expired_consents,
    'deleted_location_events',
    v_deleted_locations,
    'escalation_processing',
    v_escalation_result,
    'completed_at',
    now()
  );
end;
$$;

revoke all
on function private.safe_date_intelligence_maintenance()
from public, anon, authenticated;
