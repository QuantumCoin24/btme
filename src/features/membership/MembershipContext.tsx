import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  describeAccessBlocker,
  getMyDatingAccessState,
  type MemberAccessState,
} from "../access/memberAccess";

export type MembershipPlan = "monthly" | "six-month" | "annual";

type MembershipContextValue = {
  selectedPlan: MembershipPlan | null;
  setSelectedPlan: (plan: MembershipPlan | null) => void;

  accessState: MemberAccessState | null;
  loading: boolean;
  error: string | null;

  hasActiveMembership: boolean;
  isVerified: boolean;
  canDate: boolean;
  accessMessage: string;

  refreshMembership: () => Promise<void>;
};

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function MembershipProvider({ children }: { children: ReactNode }) {
  // This remains a UI billing-period preference only.
  // It never grants or represents an entitlement.
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  const [accessState, setAccessState] = useState<MemberAccessState | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const refreshMembership = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await getMyDatingAccessState();

      setAccessState(next);
    } catch (caught) {
      setAccessState(null);

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load membership access.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMembership();
  }, [refreshMembership]);

  const value = useMemo(
    () => ({
      selectedPlan,
      setSelectedPlan,

      accessState,
      loading,
      error,

      hasActiveMembership:
        accessState?.entitlementTier === "premium" &&
        (accessState.entitlementStatus === "active" ||
          accessState.entitlementStatus === "grace_period") &&
        Boolean(accessState.entitlementVerifiedAt),

      isVerified:
        accessState?.verificationStatus === "verified" &&
        Boolean(accessState.verificationVerifiedAt),

      canDate: accessState?.canDate ?? false,

      accessMessage: describeAccessBlocker(accessState),

      refreshMembership,
    }),
    [accessState, error, loading, refreshMembership, selectedPlan],
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);

  if (!context) {
    throw new Error("useMembership must be used inside MembershipProvider");
  }

  return context;
}
