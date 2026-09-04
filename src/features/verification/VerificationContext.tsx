import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import {
  useMembership,
} from '../membership/MembershipContext';

export type VerificationStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'needs_review';

type VerificationContextValue = {
  status: VerificationStatus;
  verified: boolean;
  verifiedAt: string | null;
  submittedAt: string | null;
  loading: boolean;
  refreshVerification: () => Promise<void>;
};

const VerificationContext =
  createContext<VerificationContextValue | null>(
    null,
  );

export function VerificationProvider({
  children,
}: PropsWithChildren) {
  const {
    accessState,
    loading,
    isVerified,
    refreshMembership,
  } = useMembership();

  const refreshVerification =
    useCallback(async () => {
      await refreshMembership();
    }, [
      refreshMembership,
    ]);

  const value =
    useMemo<VerificationContextValue>(
      () => ({
        status:
          accessState?.verificationStatus ??
          'not_started',

        verified: isVerified,

        verifiedAt:
          accessState?.verificationVerifiedAt ??
          null,

        submittedAt: null,

        loading,

        refreshVerification,
      }),
      [
        accessState,
        isVerified,
        loading,
        refreshVerification,
      ],
    );

  return (
    <VerificationContext.Provider
      value={value}
    >
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const value =
    useContext(VerificationContext);

  if (!value) {
    throw new Error(
      'useVerification must be used inside VerificationProvider',
    );
  }

  return value;
}
