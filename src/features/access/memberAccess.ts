import { isSupabaseConfigured, supabase } from "../../lib/supabase";

export type VerificationStatus =
  "not_started" | "pending" | "verified" | "failed" | "needs_review";

export type EntitlementTier = "none" | "premium";

export type EntitlementStatus =
  "inactive" | "active" | "grace_period" | "expired" | "revoked";

export type EntitlementSource =
  "none" | "apple_app_store" | "manual_admin" | "migration";

export type DatingAccessBlocker =
  "account" | "profile" | "verification" | "membership" | null;

export type MemberAccessState = {
  accountStatus: string;
  profileComplete: boolean;
  verificationStatus: VerificationStatus;
  verificationVerifiedAt: string | null;
  entitlementTier: EntitlementTier;
  entitlementStatus: EntitlementStatus;
  entitlementSource: EntitlementSource;
  entitlementCurrentPeriodEndsAt: string | null;
  entitlementVerifiedAt: string | null;
  canDate: boolean;
  blocker: DatingAccessBlocker;
};

type AccessStateRow = {
  account_status: string;
  profile_complete: boolean;
  verification_status: VerificationStatus;
  verification_verified_at: string | null;
  entitlement_tier: EntitlementTier;
  entitlement_status: EntitlementStatus;
  entitlement_source: EntitlementSource;
  entitlement_current_period_ends_at: string | null;
  entitlement_verified_at: string | null;
  can_date: boolean;
  blocker: DatingAccessBlocker;
};

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Production membership access requires Supabase.");
  }

  return supabase;
}

export async function getMyDatingAccessState(): Promise<MemberAccessState> {
  const client = requireSupabase();

  const { data, error } = await client.rpc("get_my_dating_access_state");

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as AccessStateRow | null;

  if (!row) {
    throw new Error("Member access state is unavailable.");
  }

  return {
    accountStatus: row.account_status,
    profileComplete: Boolean(row.profile_complete),
    verificationStatus: row.verification_status,
    verificationVerifiedAt: row.verification_verified_at,
    entitlementTier: row.entitlement_tier,
    entitlementStatus: row.entitlement_status,
    entitlementSource: row.entitlement_source,
    entitlementCurrentPeriodEndsAt: row.entitlement_current_period_ends_at,
    entitlementVerifiedAt: row.entitlement_verified_at,
    canDate: Boolean(row.can_date),
    blocker: row.blocker,
  };
}

export function describeAccessBlocker(state: MemberAccessState | null): string {
  if (!state) {
    return "Checking your dating access…";
  }

  switch (state.blocker) {
    case "account":
      return "Your account is not currently active.";

    case "profile":
      return "Finish your profile before entering dating.";

    case "verification":
      if (state.verificationStatus === "pending") {
        return "Your live-selfie verification is being reviewed.";
      }

      if (state.verificationStatus === "needs_review") {
        return "Your live-selfie verification needs review.";
      }

      if (state.verificationStatus === "failed") {
        return "Your live-selfie verification was not approved.";
      }

      return "Complete live-selfie verification to enter dating.";

    case "membership":
      if (state.entitlementStatus === "expired") {
        return "Your Premium membership has expired.";
      }

      if (state.entitlementStatus === "revoked") {
        return "Your Premium membership is not active.";
      }

      return "An active Premium membership is required.";

    default:
      return "Your verified Premium dating access is active.";
  }
}
