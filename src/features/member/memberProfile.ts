import {
  supabase,
} from '../../lib/supabase';

import type {
  ChemistryStyle,
  DealBreaker,
  LifestyleSignal,
} from '../compatibility/CompatibilityContext';

import type {
  MatchPreference,
  RelationshipIntent,
} from '../profile/ProfileContext';

export type MemberProfileProjection = {
  firstName: string;
  city: string;
  distanceMiles: number;
  relationshipIntent: RelationshipIntent | null;
  matchPreference: MatchPreference | null;
  minimumAge: number;
  maximumAge: number;
  lifestyleSignals: LifestyleSignal[];
  perfectSunday: string;
  greenFlag: string;
  absoluteNo: string;
  chemistryStyle: ChemistryStyle | null;
  dealBreakers: DealBreaker[];
};

function kilometresToMiles(km: number) {
  return Math.max(
    1,
    Math.round(km / 1.609344),
  );
}

export async function loadMyMemberProfile():
  Promise<MemberProfileProjection> {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user = authData.user;

  if (!user) {
    throw new Error(
      'You must be signed in to load your BTME profile.',
    );
  }

  const [
    profileResult,
    preferenceResult,
    compatibilityResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, city')
      .eq('member_id', user.id)
      .single(),

    supabase
      .from('member_preferences')
      .select(
        'relationship_intent, looking_for, minimum_age, maximum_age, distance_km',
      )
      .eq('member_id', user.id)
      .single(),

    supabase
      .from('compatibility_profiles')
      .select(
        'lifestyle_signals, perfect_sunday, green_flag, absolute_no, chemistry_style, deal_breakers',
      )
      .eq('member_id', user.id)
      .single(),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (preferenceResult.error) {
    throw preferenceResult.error;
  }

  if (compatibilityResult.error) {
    throw compatibilityResult.error;
  }

  const profile = profileResult.data;
  const preferences = preferenceResult.data;
  const compatibility =
    compatibilityResult.data;

  const lookingFor =
    Array.isArray(preferences.looking_for)
      ? preferences.looking_for
      : [];

  return {
    firstName:
      typeof profile.first_name === 'string'
        ? profile.first_name
        : '',

    city:
      typeof profile.city === 'string'
        ? profile.city
        : '',

    distanceMiles:
      typeof preferences.distance_km === 'number'
        ? kilometresToMiles(
            preferences.distance_km,
          )
        : 25,

    relationshipIntent:
      preferences.relationship_intent as
        | RelationshipIntent
        | null,

    matchPreference:
      (lookingFor[0] ?? null) as
        | MatchPreference
        | null,

    minimumAge:
      typeof preferences.minimum_age === 'number'
        ? preferences.minimum_age
        : 18,

    maximumAge:
      typeof preferences.maximum_age === 'number'
        ? preferences.maximum_age
        : 99,

    lifestyleSignals:
      Array.isArray(
        compatibility.lifestyle_signals,
      )
        ? compatibility.lifestyle_signals as
            LifestyleSignal[]
        : [],

    perfectSunday:
      typeof compatibility.perfect_sunday ===
      'string'
        ? compatibility.perfect_sunday
        : '',

    greenFlag:
      typeof compatibility.green_flag ===
      'string'
        ? compatibility.green_flag
        : '',

    absoluteNo:
      typeof compatibility.absolute_no ===
      'string'
        ? compatibility.absolute_no
        : '',

    chemistryStyle:
      compatibility.chemistry_style as
        | ChemistryStyle
        | null,

    dealBreakers:
      Array.isArray(
        compatibility.deal_breakers,
      )
        ? compatibility.deal_breakers as
            DealBreaker[]
        : [],
  };
}
