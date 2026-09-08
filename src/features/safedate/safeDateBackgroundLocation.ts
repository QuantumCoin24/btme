import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { supabase } from "../../lib/supabase";

const TASK_NAME = "btme-safedate-background-location";

type ActiveSafeDateBackgroundState = {
  datePlanId: string;
  expiresAt: string;
};

let activeState: ActiveSafeDateBackgroundState | null = null;

function isExpired(expiresAt: string) {
  const timestamp = Date.parse(expiresAt);

  return (
    !Number.isFinite(timestamp) ||
    timestamp <= Date.now()
  );
}

async function stopTaskIfRunning() {
  const running =
    await Location.hasStartedLocationUpdatesAsync(
      TASK_NAME,
    );

  if (running) {
    await Location.stopLocationUpdatesAsync(
      TASK_NAME,
    );
  }
}

TaskManager.defineTask(
  TASK_NAME,
  async ({ data, error }) => {
    if (error || !data || !activeState) {
      return;
    }

    if (isExpired(activeState.expiresAt)) {
      await stopTaskIfRunning();
      activeState = null;
      return;
    }

    const locations = (
      data as {
        locations?: Location.LocationObject[];
      }
    ).locations;

    if (!locations?.length) {
      return;
    }

    const latest =
      locations[locations.length - 1];

    if (!latest) {
      return;
    }

    try {
      await supabase.rpc(
        "record_my_safe_date_location",
        {
          p_date_plan_id:
            activeState.datePlanId,
          p_latitude:
            latest.coords.latitude,
          p_longitude:
            latest.coords.longitude,
          p_accuracy_metres:
            latest.coords.accuracy,
          p_captured_at:
            new Date(
              latest.timestamp,
            ).toISOString(),
        },
      );
    } catch {
      // A later OS location delivery provides
      // the next bounded retry opportunity.
    }
  },
);

export async function getSafeDateBackgroundPermission() {
  return Location.getBackgroundPermissionsAsync();
}

export async function requestSafeDateBackgroundPermission() {
  return Location.requestBackgroundPermissionsAsync();
}

export async function startSafeDateBackgroundLocation(
  datePlanId: string,
  expiresAt: string,
) {
  if (isExpired(expiresAt)) {
    throw new Error(
      "SafeDate location consent has expired.",
    );
  }

  const foreground =
    await Location.getForegroundPermissionsAsync();

  if (!foreground.granted) {
    throw new Error(
      "Foreground location permission is required first.",
    );
  }

  const background =
    await requestSafeDateBackgroundPermission();

  if (!background.granted) {
    throw new Error(
      "Background location permission was not granted.",
    );
  }

  activeState = {
    datePlanId,
    expiresAt,
  };

  await stopTaskIfRunning();

  await Location.startLocationUpdatesAsync(
    TASK_NAME,
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 50,
      deferredUpdatesDistance: 100,
      deferredUpdatesInterval: 60_000,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle:
          "SafeDate™ protection active",
        notificationBody:
          "BTME™ location protection is active.",
      },
    },
  );
}

export async function stopSafeDateBackgroundLocation() {
  await stopTaskIfRunning();
  activeState = null;
}

export async function isSafeDateBackgroundLocationActive() {
  return Location.hasStartedLocationUpdatesAsync(
    TASK_NAME,
  );
}
