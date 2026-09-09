import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";

import {
  getSafeDateInstallationCredential,
  readSafeDateInstallationCredential,
} from "./safeDateInstallation";

function projectId() {
  const value =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export async function registerMySafeDatePushDevice() {
  if (!isSupabaseConfigured || !Device.isDevice) {
    return false;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return false;
  }

  let permission =
    await Notifications.getPermissionsAsync();

  if (!permission.granted) {
    permission =
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
  }

  if (!permission.granted) {
    return false;
  }

  const id = projectId();

  if (!id) {
    throw new Error(
      "BTME Expo project ID is unavailable.",
    );
  }

  const [
    token,
    installation,
  ] = await Promise.all([
    Notifications.getExpoPushTokenAsync({
      projectId: id,
    }),
    getSafeDateInstallationCredential(),
  ]);

  const { error } = await supabase.rpc(
    "register_my_safe_date_push_token",
    {
      p_expo_push_token: token.data,
      p_installation_id:
        installation.installationId,
      p_installation_secret:
        installation.installationSecret,
    } as never,
  );

  if (error) {
    throw error;
  }

  return true;
}

export async function disableMySafeDatePushDevices() {
  if (!isSupabaseConfigured) {
    return;
  }

  const installation =
    await readSafeDateInstallationCredential();

  if (!installation) {
    return;
  }

  const { error } = await supabase.rpc(
    "disable_my_safe_date_push_tokens",
    {
      p_installation_id:
        installation.installationId,
      p_installation_secret:
        installation.installationSecret,
    } as never,
  );

  if (error) {
    throw error;
  }
}
