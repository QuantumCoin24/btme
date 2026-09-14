import { supabase } from '../../lib/supabase'

export type WebOnboardingInput = {
  firstName: string
  birthDate: string
  city: string
  relationshipIntent: string
  lookingFor: string[]
  minimumAge: number
  maximumAge: number
  distanceMiles: number
  lifestyleSignals: string[]
  perfectSunday: string
  greenFlag: string
  absoluteNo: string
  chemistryStyle: string
  dealBreakers: string[]
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

export async function completeWebOnboarding(
  input: WebOnboardingInput
) {
  const firstName =
    input.firstName.trim()

  const city =
    input.city.trim()

  const perfectSunday =
    input.perfectSunday.trim()

  const greenFlag =
    input.greenFlag.trim()

  const absoluteNo =
    input.absoluteNo.trim()

  if (firstName.length < 2) {
    throw new Error(
      'Enter your first name.'
    )
  }

  if (!input.birthDate) {
    throw new Error(
      'Enter your date of birth.'
    )
  }

  const birthDate =
    new Date(
      `${input.birthDate}T00:00:00`
    )

  if (
    Number.isNaN(
      birthDate.getTime()
    )
  ) {
    throw new Error(
      'Enter a valid date of birth.'
    )
  }

  const today =
    new Date()

  let age =
    today.getFullYear() -
    birthDate.getFullYear()

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth()

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate()
    )
  ) {
    age -= 1
  }

  if (age < 18) {
    throw new Error(
      'BTME™ is for adults aged 18 and over.'
    )
  }

  if (!city) {
    throw new Error(
      'Enter your city.'
    )
  }

  if (!input.relationshipIntent) {
    throw new Error(
      'Choose what you are looking for.'
    )
  }

  if (
    input.lookingFor.length === 0
  ) {
    throw new Error(
      'Choose who you would like to meet.'
    )
  }

  if (
    input.minimumAge < 18 ||
    input.maximumAge <
      input.minimumAge ||
    input.maximumAge > 99
  ) {
    throw new Error(
      'Choose a valid discovery age range.'
    )
  }

  if (
    input.lifestyleSignals.length < 2
  ) {
    throw new Error(
      'Choose at least two lifestyle signals.'
    )
  }

  if (perfectSunday.length < 6) {
    throw new Error(
      'Tell us a little more about your perfect Sunday.'
    )
  }

  if (greenFlag.length < 6) {
    throw new Error(
      'Tell us a little more about your green flag.'
    )
  }

  if (absoluteNo.length < 6) {
    throw new Error(
      'Tell us a little more about your absolute no.'
    )
  }

  if (!input.chemistryStyle) {
    throw new Error(
      'Choose your chemistry style.'
    )
  }

  const { error } =
    await supabase.rpc(
      'complete_member_onboarding',
      {
        p_first_name:
          firstName,

        p_birth_date:
          input.birthDate,

        p_city:
          city,

        p_relationship_intent:
          input.relationshipIntent,

        p_looking_for:
          input.lookingFor,

        p_minimum_age:
          Math.round(
            input.minimumAge
          ),

        p_maximum_age:
          Math.round(
            input.maximumAge
          ),

        p_distance_km:
          milesToKilometres(
            input.distanceMiles
          ),

        p_lifestyle_signals:
          input.lifestyleSignals,

        p_perfect_sunday:
          perfectSunday,

        p_green_flag:
          greenFlag,

        p_absolute_no:
          absoluteNo,

        p_chemistry_style:
          input.chemistryStyle,

        p_deal_breakers:
          input.dealBreakers
      }
    )

  if (error) {
    throw error
  }
}
