import * as Location from 'expo-location';

export type SafeDateDeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

export type SafeDateLocationPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined';

function permissionState(
  status: Location.PermissionStatus,
): SafeDateLocationPermissionState {
  if (status === Location.PermissionStatus.GRANTED) {
    return 'granted';
  }

  if (status === Location.PermissionStatus.DENIED) {
    return 'denied';
  }

  return 'undetermined';
}

export async function getSafeDateForegroundLocationPermission() {
  const permission =
    await Location.getForegroundPermissionsAsync();

  return {
    status: permissionState(permission.status),
    canAskAgain: permission.canAskAgain,
  };
}

export async function requestSafeDateForegroundLocationPermission() {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  return {
    status: permissionState(permission.status),
    canAskAgain: permission.canAskAgain,
  };
}

export async function captureSafeDateForegroundLocation():
  Promise<SafeDateDeviceLocation> {
  const permission =
    await Location.getForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error(
      'Location permission is required before SafeDate can use your location.',
    );
  }

  const location =
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    capturedAt: new Date(
      location.timestamp,
    ).toISOString(),
  };
}

export function safeDateDeviceLocationErrorMessage(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'SafeDate could not access your location.';
}
