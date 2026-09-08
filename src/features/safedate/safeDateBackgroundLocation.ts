import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { supabase } from "../../lib/supabase";

const TASK_NAME =
  "btme-safedate-background-location";

const STATE_KEY =
  "btme:safedate:background-location:v1";

type ActiveSafeDateBackgroundState = {
  datePlanId: string;
  expiresAt: string;
};

function isExpired(expiresAt: string) {
  const timestamp = Date.parse(expiresAt);

  return (
    !Number.isFinite(timestamp) ||
    timestamp <= Date.now()
  );
}

function readStoredState():
  ActiveSafeDateBackgroundState | null {
  try {
    const raw =
      globalThis.localStorage?.getItem(
        STATE_KEY,
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as
      Partial<ActiveSafeDateBackgroundState>;

    if (
      typeof parsed.datePlanId !== "string" ||
      !parsed.datePlanId.trim() ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return {
      datePlanId: parsed.datePlanId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function storeState(
  state: ActiveSafeDateBackgroundState,
) {
  globalThis.localStorage?.setItem(
    STATE_KEY,
    JSON.stringify(state),
  );
}

function clearStoredState() {
  globalThis.localStorage?.removeItem(
    STATE_KEY,
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

async function stopAndClear() {
  await stopTaskIfRunning();
  clearStoredState();
}

TaskManager.defineTask(
  TASK_NAME,
  async ({ data, error }) => {
    if (error || !data) {
      return;
    }

    const state = readStoredState();

    if (!state) {
      await stopTaskIfRunning();
      return;
    }

    if (isExpired(state.expiresAt)) {
      await stopAndClear();
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

    const { error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    const { error: rpcError } =
      await supabase.rpc(
        "record_my_safe_date_location",
        {
          p_date_plan_id:
            state.datePlanId,
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

    if (rpcError) {
      const message =
        rpcError.message.toLowerCase();

      if (
        message.includes("consent") ||
        message.includes("expired") ||
        message.includes("ended") ||
        message.includes("closed") ||
        message.includes("participant")
      ) {
        await stopAndClear();
      }
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
  const cleanId = datePlanId.trim();

  if (!cleanId) {
    throw new Error(
      "SafeDate date plan is required.",
    );
  }

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

  const state = {
    datePlanId: cleanId,
    expiresAt,
  };

  await stopTaskIfRunning();
  storeState(state);

  try {
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
  } catch (error) {
    clearStoredState();
    throw error;
  }
}

export async function stopSafeDateBackgroundLocation() {
  await stopAndClear();
}

export async function isSafeDateBackgroundLocationActive() {
  const state = readStoredState();

  if (!state || isExpired(state.expiresAt)) {
    await stopAndClear();
    return false;
  }

  return Location.hasStartedLocationUpdatesAsync(
    TASK_NAME,
  );
}

export async function reconcileSafeDateBackgroundLocation(
  datePlanId: string,
  consentEnabled: boolean,
  expiresAt: string | null,
) {
  const state = readStoredState();

  if (
    !consentEnabled ||
    !expiresAt ||
    isExpired(expiresAt) ||
    !state ||
    state.datePlanId !== datePlanId ||
    state.expiresAt !== expiresAt
  ) {
    await stopAndClear();
    return false;
  }

  return Location.hasStartedLocationUpdatesAsync(
    TASK_NAME,
  );
}
