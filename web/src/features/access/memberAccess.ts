import { supabase } from '../../lib/supabase'

export type MemberAccessState = {
  profileComplete: boolean
  entitlementTier: string | null
  entitlementStatus: string | null
  entitlementVerifiedAt: string | null
  verificationStatus: string | null
  verificationVerifiedAt: string | null
  canDate: boolean
}

export function describeAccessBlocker(
  access: MemberAccessState | null
): string {
  if (!access) {
    return 'Access status unavailable'
  }

  if (!access.profileComplete) {
    return 'Complete your profile'
  }

  if (access.entitlementStatus !== 'active') {
    return 'Active membership required'
  }

  if (access.verificationStatus !== 'verified') {
    return 'Verification required'
  }

  if (!access.canDate) {
    return 'Dating access restricted'
  }

  return 'Enabled'
}

export async function getMyDatingAccessState():
  Promise<MemberAccessState | null> {

  const { data, error } =
    await supabase.rpc(
      'get_my_dating_access_state'
    )

  if (error) {
    throw error
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data

  if (!row) {
    return null
  }

  return {
    profileComplete:
      Boolean(row.profile_complete),

    entitlementTier:
      row.entitlement_tier ?? null,

    entitlementStatus:
      row.entitlement_status ?? null,

    entitlementVerifiedAt:
      row.entitlement_verified_at ?? null,

    verificationStatus:
      row.verification_status ?? null,

    verificationVerifiedAt:
      row.verification_verified_at ?? null,

    canDate:
      Boolean(row.can_date)
  }
}
