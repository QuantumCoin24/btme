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
  setMySafeDateLocationConsent,
} from './safeDateProtection';
import {
  cancelSafeDateCheckInReminder,
  scheduleSafeDateCheckInReminder,
} from './safeDateNotifications';

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
    async () => {
      const succeeded =
        await mutate(checkInMySafeDate);

      if (
        succeeded &&
        datePlanId &&
        protection?.checkInIntervalMinutes
      ) {
        await scheduleSafeDateCheckInReminder(
          datePlanId,
          protection.checkInIntervalMinutes,
        );
      }

      return succeeded;
    },
    [
      datePlanId,
      mutate,
      protection?.checkInIntervalMinutes,
    ],
  );

  const setCheckInInterval = useCallback(
    async (minutes: number | null) => {
      if (!datePlanId) {
        return false;
      }

      const succeeded = await mutate((id) =>
        configureMySafeDateCheckIn(
          id,
          minutes,
        ),
      );

      if (!succeeded) {
        return false;
      }

      if (minutes === null) {
        await cancelSafeDateCheckInReminder(
          datePlanId,
        );
      } else {
        await scheduleSafeDateCheckInReminder(
          datePlanId,
          minutes,
        );
      }

      return true;
    },
    [datePlanId, mutate],
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

  const setLocationConsent = useCallback(
    (
      enabled: boolean,
      durationMinutes = 120,
    ) =>
      mutate((id) =>
        setMySafeDateLocationConsent(
          id,
          enabled,
          durationMinutes,
        ),
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
    setLocationConsent,
  };
}
