-- ============================================================
-- BTME SAFEDATE ACTIVE CONTROL INSTALLATION AUTHORITY
-- Forward-only compatibility repair.
--
-- Source authority:
-- 20260909010000_safedate_global_installation_authority.sql
--
-- Purpose:
-- Align the production SafeDate active-control RPC surface with
-- the installation-bound client contract already used by BTME.
--
-- This file is generated from the existing hardened definitions.
-- ============================================================

-- ============================================================
-- configure_my_safe_date_check_in
-- ============================================================

-- BEGIN BTME FINAL ACTIVE CONTROL HARDENING
-- Remove legacy non-installation-bound overloads.
-- No CASCADE: unexpected dependencies must stop deployment.

drop function if exists public.configure_my_safe_date_check_in(uuid, integer);
drop function if exists public.check_in_my_safe_date(uuid);
drop function if exists public.request_my_safe_date_assistance(uuid);
drop function if exists public.acknowledge_my_safe_date_assistance(uuid);
drop function if exists public.clear_my_safe_date_assistance(uuid);
drop function if exists public.confirm_my_safe_arrival(uuid);
drop function if exists public.set_my_safe_date_location_consent(uuid, boolean, integer);
drop function if exists public.record_my_safe_date_location(uuid, double precision, double precision, double precision, timestamptz);
drop function if exists public.add_my_safe_date_trusted_contact(text, text, text);
drop function if exists public.revoke_my_safe_date_trusted_contact(uuid);
drop function if exists public.set_my_safe_date_trusted_contact_enabled(uuid, uuid, boolean);
drop function if exists public.create_my_safe_date_trusted_contact_invite(uuid);
drop function if exists public.accept_safe_date_trusted_contact_invite(uuid);

create or replace function public.configure_my_safe_date_check_in(
  p_date_plan_id uuid,
  p_interval_minutes integer,
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
  v_session_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  if p_interval_minutes is not null
     and (
       p_interval_minutes < 5
       or p_interval_minutes > 240
     ) then
    raise exception
      'Check-in interval must be between 5 and 240 minutes.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    check_in_interval_minutes,
    next_check_in_at
  )
  values (
    v_session_id,
    v_member_id,
    p_interval_minutes,
    case
      when p_interval_minutes is null
        then null
      else
        now()
        + make_interval(
            mins => p_interval_minutes
          )
    end
  )
  on conflict on constraint safe_date_member_states_pkey
  do update set
    check_in_interval_minutes =
      excluded.check_in_interval_minutes,
    next_check_in_at =
      excluded.next_check_in_at;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'check_in_configure',
    'accepted'
  );
end;
$$;

-- ============================================================
-- check_in_my_safe_date
-- ============================================================

create or replace function public.check_in_my_safe_date(
  p_date_plan_id uuid,
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
  v_session_id uuid;
  v_interval integer;
  v_last_check_in_at timestamptz;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:check-in:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    ms.check_in_interval_minutes,
    ms.last_check_in_at
  into
    v_interval,
    v_last_check_in_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id =
      v_session_id
    and ms.member_id =
      v_member_id;

  if v_last_check_in_at is not null
     and v_last_check_in_at
       > now() - interval '5 seconds'
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      p_installation_id,
      'check_in',
      'duplicate',
      null,
      jsonb_build_object(
        'previous_check_in_at',
        v_last_check_in_at
      )
    );
    return;
  end if;

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    last_check_in_at
  )
  values (
    v_session_id,
    v_member_id,
    now()
  )
  on conflict on constraint safe_date_member_states_pkey
  do update set
    last_check_in_at = now(),
    next_check_in_at =
      case
        when v_interval is null
          then null
        else
          now()
          + make_interval(
              mins => v_interval
            )
      end;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'check_in',
    'accepted'
  );
end;
$$;

-- ============================================================
-- request_my_safe_date_assistance
-- ============================================================

create or replace function public.request_my_safe_date_assistance(
  p_date_plan_id uuid,
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
  v_session_id uuid;
  v_requested_at timestamptz;
  v_cleared_at timestamptz;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:assistance:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    ms.assistance_requested_at,
    ms.assistance_cleared_at
  into
    v_requested_at,
    v_cleared_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id =
      v_session_id
    and ms.member_id =
      v_member_id;

  if v_requested_at is not null
     and (
       v_cleared_at is null
       or v_cleared_at < v_requested_at
     )
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      p_installation_id,
      'assistance_request',
      'duplicate',
      null,
      jsonb_build_object(
        'active_since',
        v_requested_at
      )
    );
    return;
  end if;

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    assistance_requested_at,
    assistance_cleared_at
  )
  values (
    v_session_id,
    v_member_id,
    now(),
    null
  )
  on conflict on constraint safe_date_member_states_pkey
  do update set
    assistance_requested_at = now(),
    assistance_cleared_at = null;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'assistance_request',
    'accepted'
  );
end;
$$;

-- ============================================================
-- acknowledge_my_safe_date_assistance
-- ============================================================

create or replace function public.acknowledge_my_safe_date_assistance(
  p_date_plan_id uuid,
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
  v_session_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  update public.safe_date_escalations
  set
    status = 'acknowledged',
    acknowledged_at =
      coalesce(
        acknowledged_at,
        now()
      ),
    updated_at = now()
  where safe_date_session_id =
      v_session_id
    and member_id =
      v_member_id
    and escalation_type =
      'assistance_requested'
    and status =
      'active';

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

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'assistance_acknowledge',
    'accepted'
  );
end;
$$;

-- ============================================================
-- clear_my_safe_date_assistance
-- ============================================================

create or replace function public.clear_my_safe_date_assistance(
  p_date_plan_id uuid,
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
  v_session_id uuid;
  v_requested_at timestamptz;
  v_cleared_at timestamptz;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:assistance:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    ms.assistance_requested_at,
    ms.assistance_cleared_at
  into
    v_requested_at,
    v_cleared_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id =
      v_session_id
    and ms.member_id =
      v_member_id;

  if v_requested_at is null
     or (
       v_cleared_at is not null
       and v_cleared_at >= v_requested_at
     )
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      p_installation_id,
      'assistance_clear',
      'duplicate'
    );
    return;
  end if;

  update public.safe_date_member_states
  set assistance_cleared_at = now()
  where safe_date_session_id =
      v_session_id
    and member_id =
      v_member_id;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'assistance_clear',
    'accepted'
  );
end;
$$;

-- ============================================================
-- confirm_my_safe_arrival
-- ============================================================

create or replace function public.confirm_my_safe_arrival(
  p_date_plan_id uuid,
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
  v_session_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    safe_arrival_confirmed_at
  )
  values (
    v_session_id,
    v_member_id,
    now()
  )
  on conflict on constraint safe_date_member_states_pkey
  do update set
    safe_arrival_confirmed_at =
      coalesce(
        public.safe_date_member_states
          .safe_arrival_confirmed_at,
        now()
      );

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'safe_arrival_confirm',
    'accepted'
  );
end;
$$;

-- ============================================================
-- set_my_safe_date_location_consent
-- ============================================================

create or replace function public.set_my_safe_date_location_consent(
  p_date_plan_id uuid,
  p_enabled boolean,
  p_duration_minutes integer,
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
  v_session_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  if p_enabled
     and (
       p_duration_minutes is null
       or p_duration_minutes < 15
       or p_duration_minutes > 480
     ) then
    raise exception
      'Location sharing duration must be between 15 and 480 minutes.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  insert into public.safe_date_member_states (
    safe_date_session_id,
    member_id,
    location_sharing_enabled,
    location_sharing_expires_at
  )
  values (
    v_session_id,
    v_member_id,
    p_enabled,
    case
      when p_enabled
        then
          now()
          + make_interval(
              mins => p_duration_minutes
            )
      else null
    end
  )
  on conflict on constraint safe_date_member_states_pkey
  do update set
    location_sharing_enabled =
      excluded.location_sharing_enabled,
    location_sharing_expires_at =
      excluded.location_sharing_expires_at;

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'location_consent',
    'accepted'
  );
end;
$$;

-- ============================================================
-- record_my_safe_date_location
-- ============================================================

create or replace function public.record_my_safe_date_location(
  p_date_plan_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_metres double precision,
  p_captured_at timestamptz,
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
  v_session_id uuid;
  v_my_ended_at timestamptz;
  v_closed_at timestamptz;
  v_consent_enabled boolean;
  v_consent_expires_at timestamptz;
  v_last_captured_at timestamptz;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  if p_latitude is null
     or p_latitude < -90
     or p_latitude > 90
  then
    raise exception 'Latitude is invalid.';
  end if;

  if p_longitude is null
     or p_longitude < -180
     or p_longitude > 180
  then
    raise exception 'Longitude is invalid.';
  end if;

  if p_accuracy_metres is not null
     and (
       p_accuracy_metres < 0
       or p_accuracy_metres > 10000
     )
  then
    raise exception
      'Location accuracy is invalid.';
  end if;

  if p_captured_at is null then
    raise exception
      'Location capture time is required.';
  end if;

  if p_captured_at
       < now() - interval '5 minutes'
     or p_captured_at
       > now() + interval '1 minute'
  then
    raise exception
      'Location capture time is outside the accepted window.';
  end if;

  v_session_id :=
    private.assert_safe_date_participant(
      p_date_plan_id,
      v_member_id
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      'safedate:location:'
      || v_session_id::text
      || ':'
      || v_member_id::text,
      0
    )
  );

  select
    case
      when c.member_one_id =
        v_member_id
      then s.member_one_ended_at
      else s.member_two_ended_at
    end,
    s.closed_at
  into
    v_my_ended_at,
    v_closed_at
  from public.safe_date_sessions s
  join public.date_plans dp
    on dp.id = s.date_plan_id
  join public.connections c
    on c.id = dp.connection_id
  where s.id = v_session_id;

  if v_my_ended_at is not null
     or v_closed_at is not null
  then
    raise exception
      'Your SafeDate protection is no longer active.';
  end if;

  select
    ms.location_sharing_enabled,
    ms.location_sharing_expires_at
  into
    v_consent_enabled,
    v_consent_expires_at
  from public.safe_date_member_states ms
  where ms.safe_date_session_id =
      v_session_id
    and ms.member_id =
      v_member_id;

  if coalesce(
       v_consent_enabled,
       false
     ) = false
     or v_consent_expires_at is null
     or v_consent_expires_at <= now()
  then
    raise exception
      'Active SafeDate location consent is required.';
  end if;

  select max(le.captured_at)
  into v_last_captured_at
  from public.safe_date_location_events le
  where le.safe_date_session_id =
      v_session_id
    and le.member_id =
      v_member_id;

  if v_last_captured_at is not null
     and p_captured_at <= v_last_captured_at
  then
    perform private.record_safe_date_security_operation(
      v_session_id,
      v_member_id,
      p_installation_id,
      'location_record',
      'rejected',
      p_captured_at,
      jsonb_build_object(
        'reason',
        'stale_or_replayed_location',
        'last_accepted_captured_at',
        v_last_captured_at
      )
    );
    return;
  end if;

  insert into public.safe_date_location_events (
    safe_date_session_id,
    member_id,
    latitude,
    longitude,
    accuracy_metres,
    captured_at
  )
  values (
    v_session_id,
    v_member_id,
    p_latitude,
    p_longitude,
    p_accuracy_metres,
    p_captured_at
  );

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'location_record',
    'accepted',
    p_captured_at
  );
end;
$$;

-- ============================================================
-- add_my_safe_date_trusted_contact
-- ============================================================

create or replace function public.add_my_safe_date_trusted_contact(
  p_name text,
  p_phone text,
  p_email text,
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
  v_contact_id uuid;
  v_name text :=
    trim(coalesce(p_name, ''));
  v_phone text :=
    nullif(
      trim(coalesce(p_phone, '')),
      ''
    );
  v_email text :=
    nullif(
      lower(
        trim(coalesce(p_email, ''))
      ),
      ''
    );
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  if char_length(v_name) < 1
     or char_length(v_name) > 120
  then
    raise exception
      'Trusted contact name is invalid.';
  end if;

  if v_phone is null
     and v_email is null
  then
    raise exception
      'Trusted contact phone or email is required.';
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
  returning id
  into v_contact_id;

  return v_contact_id;
end;
$$;

-- ============================================================
-- revoke_my_safe_date_trusted_contact
-- ============================================================

create or replace function public.revoke_my_safe_date_trusted_contact(
  p_trusted_contact_id uuid,
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

  update public.safe_date_trusted_contacts
  set revoked_at =
    coalesce(
      revoked_at,
      now()
    )
  where id = p_trusted_contact_id
    and member_id = v_member_id;

  if not found then
    raise exception
      'Trusted contact not found.';
  end if;

  update public.safe_date_session_trusted_contacts
  set disabled_at =
    coalesce(
      disabled_at,
      now()
    )
  where trusted_contact_id =
      p_trusted_contact_id
    and member_id =
      v_member_id
    and disabled_at is null;
end;
$$;

-- ============================================================
-- set_my_safe_date_trusted_contact_enabled
-- ============================================================

create or replace function public.set_my_safe_date_trusted_contact_enabled(
  p_date_plan_id uuid,
  p_trusted_contact_id uuid,
  p_enabled boolean,
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
  v_session_id uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

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
    set disabled_at =
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
  set trusted_contact_enabled =
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

  perform private.record_safe_date_security_operation(
    v_session_id,
    v_member_id,
    p_installation_id,
    'trusted_contact_activation',
    'accepted',
    null,
    jsonb_build_object(
      'enabled',
      p_enabled,
      'trusted_contact_id',
      p_trusted_contact_id
    )
  );
end;
$$;

-- ============================================================
-- create_my_safe_date_trusted_contact_invite
-- ============================================================

create or replace function public.create_my_safe_date_trusted_contact_invite(
  p_trusted_contact_id uuid,
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
  v_token uuid;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
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

  update public.safe_date_trusted_contact_invites
  set revoked_at = now()
  where trusted_contact_id =
      p_trusted_contact_id
    and owner_member_id =
      v_member_id
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
  returning token
  into v_token;

  return v_token;
end;
$$;

-- ============================================================
-- accept_safe_date_trusted_contact_invite
-- ============================================================

create or replace function public.accept_safe_date_trusted_contact_invite(
  p_token uuid,
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
  v_invite
    public.safe_date_trusted_contact_invites%rowtype;
begin
  v_member_id :=
    private.assert_safe_date_installation(
      p_installation_id,
      p_installation_secret
    );

  select *
  into v_invite
  from public.safe_date_trusted_contact_invites
  where token = p_token
  for update;

  if v_invite.token is null then
    raise exception
      'Trusted contact invite not found.';
  end if;

  if v_invite.revoked_at is not null then
    raise exception
      'Trusted contact invite has been revoked.';
  end if;

  if v_invite.expires_at <= now() then
    raise exception
      'Trusted contact invite has expired.';
  end if;

  if v_invite.owner_member_id =
      v_member_id
  then
    raise exception
      'You cannot accept your own trusted contact invite.';
  end if;

  if v_invite.accepted_at is not null
     and v_invite.accepted_by_member_id
       <> v_member_id
  then
    raise exception
      'Trusted contact invite has already been accepted.';
  end if;

  update public.safe_date_trusted_contacts
  set
    linked_member_id =
      v_member_id,
    linked_at =
      coalesce(
        linked_at,
        now()
      )
  where id =
      v_invite.trusted_contact_id
    and member_id =
      v_invite.owner_member_id
    and revoked_at is null
    and (
      linked_member_id is null
      or linked_member_id =
        v_member_id
    );

  if not found then
    raise exception
      'Trusted contact could not be linked.';
  end if;

  update public.safe_date_trusted_contact_invites
  set
    accepted_by_member_id =
      v_member_id,
    accepted_at =
      coalesce(
        accepted_at,
        now()
      )
  where token = p_token;
end;
$$;

-- Grants are validated separately against function signatures.

-- Explicitly remove default/public execution and grant only authenticated.
do $btme_acl$
declare
  v_name text;
  v_signature text;
begin
  foreach v_name in array array[
    'configure_my_safe_date_check_in',
    'check_in_my_safe_date',
    'request_my_safe_date_assistance',
    'acknowledge_my_safe_date_assistance',
    'clear_my_safe_date_assistance',
    'confirm_my_safe_arrival',
    'set_my_safe_date_location_consent',
    'record_my_safe_date_location',
    'add_my_safe_date_trusted_contact',
    'revoke_my_safe_date_trusted_contact',
    'set_my_safe_date_trusted_contact_enabled',
    'create_my_safe_date_trusted_contact_invite',
    'accept_safe_date_trusted_contact_invite'
  ]
  loop
    for v_signature in
      select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n
        on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = v_name
        and position(
          'p_installation_id uuid'
          in pg_get_function_identity_arguments(p.oid)
        ) > 0
        and position(
          'p_installation_secret text'
          in pg_get_function_identity_arguments(p.oid)
        ) > 0
    loop
      execute format(
        'revoke all on function %s from public, anon',
        v_signature
      );

      execute format(
        'grant execute on function %s to authenticated',
        v_signature
      );
    end loop;
  end loop;
end
$btme_acl$;

-- END BTME FINAL ACTIVE CONTROL HARDENING

