import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  SafeDateProtection,
  checkInMySafeDate,
  clearMySafeDateAssistance,
  configureMySafeDateCheckIn,
  confirmMySafeArrival,
  loadMySafeDateProtection,
  requestMySafeDateAssistance,
  safeDateProtectionErrorMessage,
} from './safeDateProtection';

export function useSafeDateProtection(
  datePlanId: string | undefined,
  active: boolean,
) {
  const [
    protection,
    setProtection,
  ] = useState<SafeDateProtection | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    mutating,
    setMutating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!datePlanId || !active) {
      setProtection(null);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const next =
        await loadMySafeDateProtection(
          datePlanId,
        );

      setProtection(next);
      return next;
    } catch (caught) {
      setError(
        safeDateProtectionErrorMessage(caught),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [active, datePlanId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = useCallback(
    async (
      operation: (
        cleanDatePlanId: string,
      ) => Promise<void>,
    ) => {
      if (
        !datePlanId ||
        !active ||
        mutating
      ) {
        return false;
      }

      setMutating(true);
      setError(null);

      try {
        await operation(datePlanId);
        await refresh();
        return true;
      } catch (caught) {
        setError(
          safeDateProtectionErrorMessage(caught),
        );
        return false;
      } finally {
        setMutating(false);
      }
    },
    [
      active,
      datePlanId,
      mutating,
      refresh,
    ],
  );

  const checkIn = useCallback(
    () => mutate(checkInMySafeDate),
    [mutate],
  );

  const setCheckInInterval = useCallback(
    (minutes: number | null) =>
      mutate((id) =>
        configureMySafeDateCheckIn(
          id,
          minutes,
        ),
      ),
    [mutate],
  );

  const requestAssistance = useCallback(
    () =>
      mutate(
        requestMySafeDateAssistance,
      ),
    [mutate],
  );

  const clearAssistance = useCallback(
    () =>
      mutate(
        clearMySafeDateAssistance,
      ),
    [mutate],
  );

  const confirmSafeArrival = useCallback(
    () =>
      mutate(
        confirmMySafeArrival,
      ),
    [mutate],
  );

  return {
    protection,
    loading,
    mutating,
    error,
    refresh,
    checkIn,
    setCheckInInterval,
    requestAssistance,
    clearAssistance,
    confirmSafeArrival,
  };
}
