begin;

create or replace function public.complete_member_onboarding(
  p_first_name text,
  p_birth_date date,
  p_city text,
  p_relationship_intent text,
  p_looking_for text[],
  p_minimum_age integer,
  p_maximum_age integer,
  p_distance_km integer,
  p_lifestyle_signals text[],
  p_perfect_sunday text,
  p_green_flag text,
  p_absolute_no text,
  p_chemistry_style text,
  p_deal_breakers text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_first_name is null
     or char_length(btrim(p_first_name)) < 2 then
    raise exception 'First name is incomplete.';
  end if;

  if p_birth_date is null
     or p_birth_date > (current_date - interval '18 years')::date then
    raise exception 'Member must be at least 18.';
  end if;

  if p_city is null
     or char_length(btrim(p_city)) < 2 then
    raise exception 'Dating location is incomplete.';
  end if;

  if p_relationship_intent is null
     or char_length(btrim(p_relationship_intent)) < 2 then
    raise exception 'Relationship intent is incomplete.';
  end if;

  if coalesce(cardinality(p_looking_for), 0) < 1
     or exists (
       select 1
       from unnest(p_looking_for) as value
       where char_length(btrim(coalesce(value, ''))) < 1
     ) then
    raise exception 'Match preference is incomplete.';
  end if;

  if p_minimum_age is null
     or p_maximum_age is null
     or p_minimum_age < 18
     or p_maximum_age < p_minimum_age then
    raise exception 'Age preference is invalid.';
  end if;

  if p_distance_km is null
     or p_distance_km <= 0 then
    raise exception 'Dating distance is invalid.';
  end if;

  if coalesce(cardinality(p_lifestyle_signals), 0) < 2
     or exists (
       select 1
       from unnest(p_lifestyle_signals) as value
       where char_length(btrim(coalesce(value, ''))) < 1
     ) then
    raise exception 'Lifestyle profile is incomplete.';
  end if;

  if p_perfect_sunday is null
     or char_length(btrim(p_perfect_sunday)) < 10 then
    raise exception 'Perfect Sunday answer is incomplete.';
  end if;

  if p_green_flag is null
     or char_length(btrim(p_green_flag)) < 6 then
    raise exception 'Green flag answer is incomplete.';
  end if;

  if p_absolute_no is null
     or char_length(btrim(p_absolute_no)) < 6 then
    raise exception 'Absolutely not answer is incomplete.';
  end if;

  if p_chemistry_style is null
     or char_length(btrim(p_chemistry_style)) < 1 then
    raise exception 'Chemistry style is incomplete.';
  end if;

  if p_deal_breakers is null then
    raise exception 'Deal breakers must be supplied.';
  end if;

  update public.profiles
  set
    first_name = btrim(p_first_name),
    birth_date = p_birth_date,
    city = btrim(p_city)
  where member_id = v_member_id;

  if not found then
    raise exception 'Member profile bootstrap is missing.';
  end if;

  update public.member_preferences
  set
    relationship_intent = p_relationship_intent,
    looking_for = p_looking_for,
    minimum_age = p_minimum_age,
    maximum_age = p_maximum_age,
    distance_km = p_distance_km
  where member_id = v_member_id;

  if not found then
    raise exception 'Member preferences bootstrap is missing.';
  end if;

  update public.compatibility_profiles
  set
    lifestyle_signals = p_lifestyle_signals,
    perfect_sunday = btrim(p_perfect_sunday),
    green_flag = btrim(p_green_flag),
    absolute_no = btrim(p_absolute_no),
    chemistry_style = p_chemistry_style,
    deal_breakers = p_deal_breakers
  where member_id = v_member_id;

  if not found then
    raise exception 'Compatibility bootstrap is missing.';
  end if;

  update public.profiles
  set profile_complete = true
  where member_id = v_member_id;

  if not found then
    raise exception 'Member profile completion failed.';
  end if;
end;
$$;

revoke all on function public.complete_member_onboarding(
  text,
  date,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  text[],
  text,
  text,
  text,
  text,
  text[]
) from public;

revoke all on function public.complete_member_onboarding(
  text,
  date,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  text[],
  text,
  text,
  text,
  text,
  text[]
) from anon;

grant execute on function public.complete_member_onboarding(
  text,
  date,
  text,
  text,
  text[],
  integer,
  integer,
  integer,
  text[],
  text,
  text,
  text,
  text,
  text[]
) to authenticated;

commit;
