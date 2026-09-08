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

  const expiresAt = new Date(
    Date.now() + durationMinutes * 60_000,
  ).toISOString();

  try {
    await startSafeDateBackgroundLocation(
      datePlanId,
      expiresAt,
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
