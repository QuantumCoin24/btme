import {
  captureSafeDateForegroundLocation,
  getSafeDateForegroundLocationPermission,
  requestSafeDateForegroundLocationPermission,
} from './safeDateDeviceLocation';
import {
  recordMySafeDateLocation,
  setMySafeDateLocationConsent,
} from './safeDateProtection';

export type EnableSafeDateLocationResult =
  | {
      enabled: true;
      canAskAgain: boolean;
    }
  | {
      enabled: false;
      reason: 'permission-denied';
      canAskAgain: boolean;
    };

export async function enableMySafeDateLocationProtection(
  datePlanId: string,
  durationMinutes = 120,
): Promise<EnableSafeDateLocationResult> {
  let permission =
    await getSafeDateForegroundLocationPermission();

  if (permission.status !== 'granted') {
    permission =
      await requestSafeDateForegroundLocationPermission();
  }

  if (permission.status !== 'granted') {
    return {
      enabled: false,
      reason: 'permission-denied',
      canAskAgain: permission.canAskAgain,
    };
  }

  await setMySafeDateLocationConsent(
    datePlanId,
    true,
    durationMinutes,
  );

  try {
    const location =
      await captureSafeDateForegroundLocation();

    await recordMySafeDateLocation(
      datePlanId,
      location,
    );
  } catch (error) {
    try {
      await setMySafeDateLocationConsent(
        datePlanId,
        false,
        durationMinutes,
      );
    } catch {
      // Preserve the original activation failure.
    }

    throw error;
  }

  return {
    enabled: true,
    canAskAgain: permission.canAskAgain,
  };
}

export async function disableMySafeDateLocationProtection(
  datePlanId: string,
) {
  await setMySafeDateLocationConsent(
    datePlanId,
    false,
  );
}

export async function recordCurrentSafeDateLocation(
  datePlanId: string,
) {
  const location =
    await captureSafeDateForegroundLocation();

  await recordMySafeDateLocation(
    datePlanId,
    location,
  );

  return location;
}
