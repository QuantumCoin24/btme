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
  v_steps jsonb;
  v_step jsonb;
  v_expected_step text;
  v_step_name text;
  v_face_count integer;
  v_capture_quality double precision;
  v_yaw double precision;
  v_width double precision;
  v_height double precision;
  v_center_x double precision;
  v_center_y double precision;
  v_index integer;
  v_minimum_quality double precision := 1.0;
begin
  if p_member_id is null
    or p_challenge_id is null
    or p_challenge_version is null
    or p_result_summary is null then
    raise exception 'Live selfie completion evidence is required.';
  end if;

  if p_challenge_version <> 'v1' then
    raise exception 'Unsupported live selfie challenge version.';
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

  v_steps := p_result_summary -> 'steps';

  if v_steps is null
    or jsonb_typeof(v_steps) <> 'array' then
    raise exception 'Live selfie evidence is invalid.';
  end if;

  if jsonb_array_length(v_steps)
    <> cardinality(v_challenge.sequence) then
    raise exception 'Live selfie evidence length mismatch.';
  end if;

  for v_index in
    0..jsonb_array_length(v_steps) - 1
  loop
    v_step := v_steps -> v_index;
    v_expected_step :=
      v_challenge.sequence[v_index + 1];

    if jsonb_typeof(v_step) <> 'object' then
      raise exception 'Live selfie step is invalid.';
    end if;

    v_step_name := v_step ->> 'step';

    if v_step_name is distinct from v_expected_step then
      raise exception 'Live selfie sequence mismatch.';
    end if;

    begin
      v_face_count :=
        (v_step ->> 'faceCount')::integer;
      v_capture_quality :=
        (v_step ->> 'captureQuality')::double precision;
      v_yaw :=
        (v_step ->> 'yaw')::double precision;
      v_width :=
        (v_step ->> 'width')::double precision;
      v_height :=
        (v_step ->> 'height')::double precision;
      v_center_x :=
        (v_step ->> 'centerX')::double precision;
      v_center_y :=
        (v_step ->> 'centerY')::double precision;
    exception
      when others then
        raise exception 'Live selfie measurements are invalid.';
    end;

    if v_face_count <> 1 then
      raise exception 'Live selfie requires exactly one face.';
    end if;

    if v_capture_quality < 0.35
      or v_capture_quality > 1.0 then
      raise exception 'Live selfie capture quality is insufficient.';
    end if;

    if v_width < 0.20
      or v_width > 1.0
      or v_height < 0.20
      or v_height > 1.0 then
      raise exception 'Live selfie face size is invalid.';
    end if;

    if v_center_x < 0.25
      or v_center_x > 0.75
      or v_center_y < 0.20
      or v_center_y > 0.80 then
      raise exception 'Live selfie face position is invalid.';
    end if;

    if v_expected_step = 'neutral' then
      if abs(v_yaw) > 0.22 then
        raise exception 'Neutral live selfie step failed.';
      end if;
    elsif v_expected_step = 'turn_left' then
      if v_yaw > -0.20 then
        raise exception 'Left live selfie step failed.';
      end if;
    elsif v_expected_step = 'turn_right' then
      if v_yaw < 0.20 then
        raise exception 'Right live selfie step failed.';
      end if;
    else
      raise exception 'Unknown live selfie challenge step.';
    end if;

    v_minimum_quality :=
      least(
        v_minimum_quality,
        v_capture_quality
      );
  end loop;

  update private.live_selfie_challenges
  set
    status = 'completed',
    completed_at = now(),
    consumed_at = now(),
    failure_code = null,
    result_summary = jsonb_build_object(
      'version',
      'v1',
      'step_count',
      jsonb_array_length(v_steps),
      'minimum_capture_quality',
      v_minimum_quality,
      'completed',
      true
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
  'Service-role-only atomic BTME Live Selfie completion boundary. Validates server-issued sequence and structured on-device evidence before consuming the challenge and invoking trusted verification authority.';
