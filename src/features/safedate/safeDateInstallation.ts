import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";

const INSTALLATION_ID_KEY =
  "btme.safedate.installation-id.v1";

const INSTALLATION_SECRET_KEY =
  "btme.safedate.installation-secret.v1";
export type SafeDateInstallationCredential = {
  installationId: string;
  installationSecret: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function randomSecret() {
  const bytes = await Crypto.getRandomBytesAsync(32);

  return bytesToHex(bytes);
}

async function createCredential():
Promise<SafeDateInstallationCredential> {
  const installationId = Crypto.randomUUID();
  const installationSecret = await randomSecret();

  await Promise.all([
    SecureStore.setItemAsync(
      INSTALLATION_ID_KEY,
      installationId,
    ),
    SecureStore.setItemAsync(
      INSTALLATION_SECRET_KEY,
      installationSecret,
    ),
  ]);

  return {
    installationId,
    installationSecret,
  };
}

export async function readSafeDateInstallationCredential():
Promise<SafeDateInstallationCredential | null> {
  const [
    installationId,
    installationSecret,
  ] = await Promise.all([
    SecureStore.getItemAsync(
      INSTALLATION_ID_KEY,
    ),
    SecureStore.getItemAsync(
      INSTALLATION_SECRET_KEY,
    ),
  ]);

  if (
    !installationId ||
    !installationSecret
  ) {
    return null;
  }

  return {
    installationId,
    installationSecret,
  };
}

export async function getSafeDateInstallationCredential():
Promise<SafeDateInstallationCredential> {
  const existing =
    await readSafeDateInstallationCredential();

  if (existing) {
    return existing;
  }

  return createCredential();
}

export async function ensureSafeDateInstallationRegistered() {

  if (!isSupabaseConfigured) {

    throw new Error(

      "SafeDate installation authority is unavailable.",

    );

  }

  const credential =

    await getSafeDateInstallationCredential();

  const {

    data: { session },

  } = await supabase.auth.getSession();

  if (!session) {

    throw new Error(

      "SafeDate installation registration requires authentication.",

    );

  }

  const { error } = await supabase.rpc(

    "register_my_safe_date_installation" as never,

    {

      p_installation_id:

        credential.installationId,

      p_installation_secret:

        credential.installationSecret,

    } as never,

  );

  if (error) {

    throw error;

  }

  return credential;

}

export async function getSafeDateInstallationRpcArgs() {
  const credential =
    await ensureSafeDateInstallationRegistered();

  return {
    p_installation_id:
      credential.installationId,
    p_installation_secret:
      credential.installationSecret,
  };
}

export async function revokeSafeDateInstallation() {
  if (!isSupabaseConfigured) {
    return;
  }

  const credential =
    await readSafeDateInstallationCredential();

  if (!credential) {
    return;
  }

  const { error } = await supabase.rpc(
    "revoke_my_safe_date_installation" as never,
    {
      p_installation_id:
        credential.installationId,
      p_installation_secret:
        credential.installationSecret,
    } as never,
  );

  if (error) {
    throw error;
  }
}

export async function clearSafeDateInstallationCredential() {
  await Promise.all([
    SecureStore.deleteItemAsync(
      INSTALLATION_ID_KEY,
    ),
    SecureStore.deleteItemAsync(
      INSTALLATION_SECRET_KEY,
    ),
  ]);
}
