import type {
  User,
} from '@supabase/supabase-js';

import {
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase';

import type {
  RelationshipIntent,
  MatchPreference,
} from '../profile/ProfileContext';

import type {
  ChemistryStyle,
  DealBreaker,
  LifestyleSignal,
} from '../compatibility/CompatibilityContext';

export type MemberOnboardingSnapshot = {
  firstName: string;
  birthDate: string;
  city: string;
  distanceMiles: number;
  relationshipIntent: RelationshipIntent;
  matchPreference: MatchPreference;
  minimumAge: number;
  maximumAge: number;
  lifestyleSignals: LifestyleSignal[];
  perfectSunday: string;
  greenFlag: string;
  absoluteNo: string;
  chemistryStyle: ChemistryStyle;
  dealBreakers: DealBreaker[];
};

export type MemberPersistenceResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

function milesToKilometres(
  miles: number,
) {
  return Math.round(miles * 1.609344);
}

function parseBirthDateForDatabase(
  value: string,
) {
  const match =
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(
      value.trim(),
    );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date =
    new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const yyyy =
    String(year).padStart(4, '0');
  const mm =
    String(month).padStart(2, '0');
  const dd =
    String(day).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

function isAtLeast18(
  databaseBirthDate: string,
): boolean {
  const parts =
    databaseBirthDate
      .split('-')
      .map(Number);

  const [
    year,
    month,
    day,
  ] = parts;

  if (
    !year ||
    !month ||
    !day
  ) {
    return false;
  }

  const today = new Date();

  let age =
    today.getFullYear() - year;

  const currentMonth =
    today.getMonth() + 1;

  const birthdayHasPassed =
    currentMonth > month ||
    (
      currentMonth === month &&
      today.getDate() >= day
    );

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= 18;
}

function validateSnapshot(
  snapshot: MemberOnboardingSnapshot,
) {
  if (snapshot.firstName.trim().length < 2) {
    return 'First name is incomplete.';
  }

  if (!parseBirthDateForDatabase(
    snapshot.birthDate,
  )) {
    return 'Birth date is invalid.';
  }

  if (snapshot.city.trim().length < 2) {
    return 'Dating location is incomplete.';
  }

  if (
    !Number.isFinite(snapshot.distanceMiles) ||
    snapshot.distanceMiles <= 0
  ) {
    return 'Dating distance is invalid.';
  }

  if (
    snapshot.minimumAge < 18 ||
    snapshot.maximumAge <
      snapshot.minimumAge
  ) {
    return 'Age preference is invalid.';
  }

  if (
    snapshot.lifestyleSignals.length < 2
  ) {
    return 'Lifestyle profile is incomplete.';
  }

  if (
    snapshot.perfectSunday.trim().length < 10
  ) {
    return 'Perfect Sunday answer is incomplete.';
  }

  if (
    snapshot.greenFlag.trim().length < 6
  ) {
    return 'Green flag answer is incomplete.';
  }

  if (
    snapshot.absoluteNo.trim().length < 6
  ) {
    return 'Absolutely not answer is incomplete.';
  }

  return null;
}

async function requireAuthenticatedUser():
  Promise<User> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'BTME production services are not configured.',
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      'You must be signed in before your BTME profile can be saved.',
    );
  }

  return data.user;
}

export async function persistMemberOnboarding(
  snapshot: MemberOnboardingSnapshot,
): Promise<MemberPersistenceResult> {
  const validationError =
    validateSnapshot(snapshot);

  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  try {
    await requireAuthenticatedUser();

    const birthDate =
      parseBirthDateForDatabase(
        snapshot.birthDate,
      );

    if (!birthDate) {
      return {
        ok: false,
        message: 'Birth date is invalid.',
      };
    }

    if (!isAtLeast18(birthDate)) {
      return {
        ok: false,
        message: 'You must be 18 or over to use BTME.',
      };
    }

    const {
      error,
    } = await supabase.rpc(
      'complete_member_onboarding',
      {
        p_first_name:
          snapshot.firstName.trim(),
        p_birth_date:
          birthDate,
        p_city:
          snapshot.city.trim(),
        p_relationship_intent:
          snapshot.relationshipIntent,
        p_looking_for: [
          snapshot.matchPreference,
        ],
        p_minimum_age:
          snapshot.minimumAge,
        p_maximum_age:
          snapshot.maximumAge,
        p_distance_km:
          milesToKilometres(
            snapshot.distanceMiles,
          ),
        p_lifestyle_signals:
          snapshot.lifestyleSignals,
        p_perfect_sunday:
          snapshot.perfectSunday.trim(),
        p_green_flag:
          snapshot.greenFlag.trim(),
        p_absolute_no:
          snapshot.absoluteNo.trim(),
        p_chemistry_style:
          snapshot.chemistryStyle,
        p_deal_breakers:
          snapshot.dealBreakers,
      },
    );

    if (error) {
      throw error;
    }

    return {
      ok: true,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : 'BTME could not save your profile.';

    console.error(
      '[BTME] complete_member_onboarding failed',
      error,
    );

    return {
      ok: false,
      message,
    };
  }
}
