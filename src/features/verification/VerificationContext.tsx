import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useAuth,
} from '../auth/AuthContext';
import {
  supabase,
} from '../../lib/supabase';

export type VerificationStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'needs_review';

type VerificationRecord = {
  status: VerificationStatus;
  verified_at: string | null;
  submitted_at: string | null;
};

type VerificationContextValue = {
  status: VerificationStatus;
  verified: boolean;
  verifiedAt: string | null;
  submittedAt: string | null;
  loading: boolean;
  refreshVerification: () => Promise<void>;
};

const VerificationContext =
  createContext<VerificationContextValue | null>(null);

export function VerificationProvider({
  children,
}: PropsWithChildren) {
  const {
    user,
  } = useAuth();

  const [
    status,
    setStatus,
  ] = useState<VerificationStatus>('not_started');

  const [
    verifiedAt,
    setVerifiedAt,
  ] = useState<string | null>(null);

  const [
    submittedAt,
    setSubmittedAt,
  ] = useState<string | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const clearVerification = useCallback(() => {
    setStatus('not_started');
    setVerifiedAt(null);
    setSubmittedAt(null);
  }, []);

  const refreshVerification = useCallback(async () => {
    if (!user) {
      clearVerification();
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from('identity_verifications')
        .select(
          'status, verified_at, submitted_at',
        )
        .eq('member_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        clearVerification();
        return;
      }

      const record = data as VerificationRecord;

      setStatus(record.status);
      setVerifiedAt(record.verified_at);
      setSubmittedAt(record.submitted_at);
    } finally {
      setLoading(false);
    }
  }, [
    clearVerification,
    user,
  ]);

  useEffect(() => {
    if (!user) {
      clearVerification();
      setLoading(false);
      return;
    }

    void refreshVerification().catch((error: unknown) => {
      console.warn(
        '[BTME] Unable to restore identity verification state:',
        error instanceof Error
          ? error.message
          : String(error),
      );

      clearVerification();
    });
  }, [
    clearVerification,
    refreshVerification,
    user,
  ]);

  const value = useMemo<VerificationContextValue>(
    () => ({
      status,
      verified:
        status === 'verified' &&
        verifiedAt !== null,
      verifiedAt,
      submittedAt,
      loading,
      refreshVerification,
    }),
    [
      loading,
      refreshVerification,
      status,
      submittedAt,
      verifiedAt,
    ],
  );

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const value = useContext(VerificationContext);

  if (!value) {
    throw new Error(
      'useVerification must be used inside VerificationProvider',
    );
  }

  return value;
}
