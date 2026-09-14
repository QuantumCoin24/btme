import { supabase } from '../../lib/supabase'

export type MemberProfile = {
  firstName: string
  city: string
  bio: string
  relationshipIntent: string | null
  lookingFor: string[]
  minimumAge: number
  maximumAge: number
  distanceMiles: number
  lifestyleSignals: string[]
  perfectSunday: string
  greenFlag: string
  absoluteNo: string
  chemistryStyle: string | null
  dealBreakers: string[]
}

export type EditableMemberProfile = {
  city: string
  bio: string
  minimumAge: number
  maximumAge: number
  distanceMiles: number
  perfectSunday: string
  greenFlag: string
  absoluteNo: string
}

function kilometresToMiles(
  km: number
) {
  return Math.max(
    1,
    Math.round(
      km / 1.609344
    )
  )
}

function milesToKilometres(
  miles: number
) {
  return Math.max(
    1,
    Math.round(
      miles * 1.609344
    )
  )
}

async function requireUser() {
  const {
    data: { user },
    error
  } =
    await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'You must be signed in to manage your BTME™ profile.'
    )
  }

  return user
}

export async function loadMyMemberProfile():
  Promise<MemberProfile> {

  const user =
    await requireUser()

  const [
    profileResult,
    preferenceResult,
    compatibilityResult
  ] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'first_name, city, bio'
        )
        .eq(
          'member_id',
          user.id
        )
        .single(),

      supabase
        .from('member_preferences')
        .select(
          'relationship_intent, looking_for, minimum_age, maximum_age, distance_km'
        )
        .eq(
          'member_id',
          user.id
        )
        .single(),

      supabase
        .from('compatibility_profiles')
        .select(
          'lifestyle_signals, perfect_sunday, green_flag, absolute_no, chemistry_style, deal_breakers'
        )
        .eq(
          'member_id',
          user.id
        )
        .single()
    ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (preferenceResult.error) {
    throw preferenceResult.error
  }

  if (compatibilityResult.error) {
    throw compatibilityResult.error
  }

  const profile =
    profileResult.data

  const preferences =
    preferenceResult.data

  const compatibility =
    compatibilityResult.data

  return {
    firstName:
      typeof profile.first_name === 'string'
        ? profile.first_name
        : '',

    city:
      typeof profile.city === 'string'
        ? profile.city
        : '',

    bio:
      typeof profile.bio === 'string'
        ? profile.bio
        : '',

    relationshipIntent:
      typeof preferences.relationship_intent === 'string'
        ? preferences.relationship_intent
        : null,

    lookingFor:
      Array.isArray(
        preferences.looking_for
      )
        ? preferences.looking_for.filter(
            (
              value
            ): value is string =>
              typeof value === 'string'
          )
        : [],

    minimumAge:
      typeof preferences.minimum_age === 'number'
        ? preferences.minimum_age
        : 18,

    maximumAge:
      typeof preferences.maximum_age === 'number'
        ? preferences.maximum_age
        : 99,

    distanceMiles:
      typeof preferences.distance_km === 'number'
        ? kilometresToMiles(
            preferences.distance_km
          )
        : 25,

    lifestyleSignals:
      Array.isArray(
        compatibility.lifestyle_signals
      )
        ? compatibility.lifestyle_signals.filter(
            (
              value
            ): value is string =>
              typeof value === 'string'
          )
        : [],

    perfectSunday:
      typeof compatibility.perfect_sunday === 'string'
        ? compatibility.perfect_sunday
        : '',

    greenFlag:
      typeof compatibility.green_flag === 'string'
        ? compatibility.green_flag
        : '',

    absoluteNo:
      typeof compatibility.absolute_no === 'string'
        ? compatibility.absolute_no
        : '',

    chemistryStyle:
      typeof compatibility.chemistry_style === 'string'
        ? compatibility.chemistry_style
        : null,

    dealBreakers:
      Array.isArray(
        compatibility.deal_breakers
      )
        ? compatibility.deal_breakers.filter(
            (
              value
            ): value is string =>
              typeof value === 'string'
          )
        : []
  }
}

export async function updateMyMemberProfile(
  input: EditableMemberProfile
): Promise<MemberProfile> {

  const user =
    await requireUser()

  const city =
    input.city.trim()

  const bio =
    input.bio.trim()

  const minimumAge =
    Math.max(
      18,
      Math.round(
        input.minimumAge
      )
    )

  const maximumAge =
    Math.max(
      minimumAge,
      Math.round(
        input.maximumAge
      )
    )

  const distanceMiles =
    Math.max(
      1,
      Math.round(
        input.distanceMiles
      )
    )

  if (!city) {
    throw new Error(
      'City is required.'
    )
  }

  if (
    minimumAge > 99 ||
    maximumAge > 99
  ) {
    throw new Error(
      'Choose an age range between 18 and 99.'
    )
  }

  const [
    profileResult,
    preferenceResult,
    compatibilityResult
  ] =
    await Promise.all([
      supabase
        .from('profiles')
        .update({
          city,
          bio
        })
        .eq(
          'member_id',
          user.id
        ),

      supabase
        .from('member_preferences')
        .update({
          minimum_age:
            minimumAge,

          maximum_age:
            maximumAge,

          distance_km:
            milesToKilometres(
              distanceMiles
            )
        })
        .eq(
          'member_id',
          user.id
        ),

      supabase
        .from('compatibility_profiles')
        .update({
          perfect_sunday:
            input.perfectSunday.trim(),

          green_flag:
            input.greenFlag.trim(),

          absolute_no:
            input.absoluteNo.trim()
        })
        .eq(
          'member_id',
          user.id
        )
    ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (preferenceResult.error) {
    throw preferenceResult.error
  }

  if (compatibilityResult.error) {
    throw compatibilityResult.error
  }

  return loadMyMemberProfile()
}
