create table private.live_selfie_challenges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null
    references public.members(id)
    on delete cascade,
  challenge_version text not null default 'v1',
  sequence text[] not null,
  status text not null default 'issued'
    check (
      status in (
        'issued',
        'completed',
        'failed',
        'expired'
      )
    ),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  consumed_at timestamptz,
  failure_code text,
  result_summary jsonb,
  constraint live_selfie_challenges_sequence_length
    check (
      cardinality(sequence) between 3 and 5
    ),
  constraint live_selfie_challenges_expiry
    check (
      expires_at > issued_at
      and expires_at <= issued_at + interval '10 minutes'
    ),
  constraint live_selfie_challenges_failure_code_length
    check (
      failure_code is null
      or char_length(failure_code) between 1 and 100
    )
);

create index live_selfie_challenges_member_idx
  on private.live_selfie_challenges(
    member_id,
    issued_at desc
  );

revoke all
  on table private.live_selfie_challenges
  from public;

revoke all
  on table private.live_selfie_challenges
  from anon;

revoke all
  on table private.live_selfie_challenges
  from authenticated;

create or replace function public.start_my_live_selfie_challenge()
returns table (
  challenge_id uuid,
  challenge_version text,
  sequence text[],
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_challenge_id uuid;
  v_sequence text[];
  v_expires_at timestamptz;
begin
  v_member_id := auth.uid();

  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = v_member_id
      and m.account_status = 'active'
  ) then
    raise exception 'Active member account required.';
  end if;

  update private.live_selfie_challenges c
  set
    status = 'expired',
    failure_code = 'superseded'
  where c.member_id = v_member_id
    and c.status = 'issued';

  if random() < 0.5 then
    v_sequence := array[
      'neutral',
      'turn_left',
      'neutral',
      'turn_right',
      'neutral'
    ];
  else
    v_sequence := array[
      'neutral',
      'turn_right',
      'neutral',
      'turn_left',
      'neutral'
    ];
  end if;

  v_expires_at := now() + interval '5 minutes';

  insert into private.live_selfie_challenges (
    member_id,
    challenge_version,
    sequence,
    expires_at
  )
  values (
    v_member_id,
    'v1',
    v_sequence,
    v_expires_at
  )
  returning id
  into v_challenge_id;

  return query
  select
    v_challenge_id,
    'v1'::text,
    v_sequence,
    v_expires_at;
end;
$$;

revoke all
  on function public.start_my_live_selfie_challenge()
  from public;

revoke all
  on function public.start_my_live_selfie_challenge()
  from anon;

grant execute
  on function public.start_my_live_selfie_challenge()
  to authenticated;

comment on function public.start_my_live_selfie_challenge() is
  'Issues a short-lived authenticated BTME live-selfie challenge. No image, video or biometric template is stored.';

create or replace function public.complete_live_selfie_challenge_authority(
  p_member_id uuid,
  p_challenge_id uuid,
  p_challenge_version text,
  p_result_summary jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge private.live_selfie_challenges%rowtype;
begin
  if p_member_id is null
    or p_challenge_id is null then
    raise exception 'Member and challenge are required.';
  end if;

  select *
  into v_challenge
  from private.live_selfie_challenges c
  where c.id = p_challenge_id
  for update;

  if not found then
    raise exception 'Live selfie challenge not found.';
  end if;

  if v_challenge.member_id <> p_member_id then
    raise exception 'Live selfie challenge ownership mismatch.';
  end if;

  if v_challenge.challenge_version <> p_challenge_version then
    raise exception 'Live selfie challenge version mismatch.';
  end if;

  if v_challenge.status <> 'issued'
    or v_challenge.consumed_at is not null then
    raise exception 'Live selfie challenge has already been consumed.';
  end if;

  if v_challenge.expires_at <= now() then
    update private.live_selfie_challenges
    set
      status = 'expired',
      failure_code = 'expired',
      consumed_at = now()
    where id = p_challenge_id;

    raise exception 'Live selfie challenge expired.';
  end if;

  update private.live_selfie_challenges
  set
    status = 'completed',
    completed_at = now(),
    consumed_at = now(),
    failure_code = null,
    result_summary = coalesce(
      p_result_summary,
      '{}'::jsonb
    )
  where id = p_challenge_id;

  perform public.apply_member_verification_authority(
    p_member_id,
    'verified',
    'btme_live_selfie',
    p_challenge_id::text,
    null,
    'trusted_server',
    'live-selfie-verify:' || p_challenge_id::text
  );
end;
$$;

revoke all
  on function public.complete_live_selfie_challenge_authority(
    uuid,
    uuid,
    text,
    jsonb
  )
  from public;

revoke all
  on function public.complete_live_selfie_challenge_authority(
    uuid,
    uuid,
    text,
    jsonb
  )
  from anon;

revoke all
  on function public.complete_live_selfie_challenge_authority(
    uuid,
    uuid,
    text,
    jsonb
  )
  from authenticated;

grant execute
  on function public.complete_live_selfie_challenge_authority(
    uuid,
    uuid,
    text,
    jsonb
  )
  to service_role;

comment on function public.complete_live_selfie_challenge_authority(
  uuid,
  uuid,
  text,
  jsonb
) is
  'Service-role-only one-time completion boundary for BTME Live Selfie Verified. Consumes a valid server-issued challenge before invoking trusted verification authority.';
