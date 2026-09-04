import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  describeAccessBlocker,
  getMyDatingAccessState,
  type MemberAccessState,
} from '../access/memberAccess';
import { useAuth } from '../auth/AuthContext';

export type MembershipPlan =
  | 'monthly'
  | 'six-month'
  | 'annual';

type MembershipContextValue = {
  selectedPlan: MembershipPlan | null;
  setSelectedPlan: (
    plan: MembershipPlan | null
  ) => void;

  accessState: MemberAccessState | null;
  loading: boolean;
  error: string | null;

  profileComplete: boolean;
  hasActiveMembership: boolean;
  isVerified: boolean;
  canDate: boolean;
  accessMessage: string;

  refreshMembership: () => Promise<void>;
};

const MembershipContext =
  createContext<MembershipContextValue | null>(null);

export function MembershipProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    initialized,
    user,
  } = useAuth();

  const [selectedPlan, setSelectedPlan] =
    useState<MembershipPlan | null>(null);

  const [accessState, setAccessState] =
    useState<MemberAccessState | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const refreshMembership =
    useCallback(async () => {
      if (!initialized || !user) {
        setAccessState(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const next =
          await getMyDatingAccessState();

        setAccessState(next);
      } catch (caught) {
        setAccessState(null);

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load member access.',
        );
      } finally {
        setLoading(false);
      }
    }, [
      initialized,
      user?.id,
    ]);

  useEffect(() => {
    if (!initialized || !user) {
      setAccessState(null);
      setError(null);
      setLoading(false);
      return;
    }

    void refreshMembership();
  }, [
    initialized,
    refreshMembership,
    user?.id,
  ]);

  const profileComplete =
    accessState?.profileComplete ?? false;

  const hasActiveMembership =
    accessState?.entitlementTier === 'premium' &&
    (
      accessState.entitlementStatus === 'active' ||
      accessState.entitlementStatus ===
        'grace_period'
    ) &&
    Boolean(accessState.entitlementVerifiedAt);

  const isVerified =
    accessState?.verificationStatus ===
      'verified' &&
    Boolean(
      accessState.verificationVerifiedAt,
    );

  const canDate =
    accessState?.canDate ?? false;

  const value =
    useMemo<MembershipContextValue>(
      () => ({
        selectedPlan,
        setSelectedPlan,

        accessState,
        loading,
        error,

        profileComplete,
        hasActiveMembership,
        isVerified,
        canDate,
        accessMessage:
          describeAccessBlocker(accessState),

        refreshMembership,
      }),
      [
        accessState,
        canDate,
        error,
        hasActiveMembership,
        isVerified,
        loading,
        profileComplete,
        refreshMembership,
        selectedPlan,
      ],
    );

  return (
    <MembershipContext.Provider
      value={value}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context =
    useContext(MembershipContext);

  if (!context) {
    throw new Error(
      'useMembership must be used inside MembershipProvider',
    );
  }

  return context;
}
