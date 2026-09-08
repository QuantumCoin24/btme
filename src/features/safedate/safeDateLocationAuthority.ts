import {
  captureSafeDateForegroundLocation,
  getSafeDateForegroundLocationPermission,
  requestSafeDateForegroundLocationPermission,
} from './safeDateDeviceLocation';
import {
  startSafeDateBackgroundLocation,
  stopSafeDateBackgroundLocation,
} from './safeDateBackgroundLocation';
import {
  loadMySafeDateProtection,
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

  const authoritativeProtection =
    await loadMySafeDateProtection(datePlanId);

  if (
    !authoritativeProtection.locationSharingEnabled ||
    !authoritativeProtection.locationSharingExpiresAt
  ) {
    await stopSafeDateBackgroundLocation();

    try {
      await setMySafeDateLocationConsent(
        datePlanId,
        false,
        durationMinutes,
      );
    } catch {
      // Server remains authoritative.
    }

    throw new Error(
      'SafeDate location protection could not confirm server consent.',
    );
  }


  try {
    await startSafeDateBackgroundLocation(
      datePlanId,
      authoritativeProtection.locationSharingExpiresAt,
    );
  } catch (error) {
    try {
      await setMySafeDateLocationConsent(
        datePlanId,
        false,
        durationMinutes,
      );
    } catch {
      // Preserve the background activation failure.
    }

    await stopSafeDateBackgroundLocation();
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

  await stopSafeDateBackgroundLocation();
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
