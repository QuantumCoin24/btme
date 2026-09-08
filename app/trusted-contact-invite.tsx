import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  acceptSafeDateTrustedContactInvite,
} from "../src/features/safedate/safeDateTrustedContacts";
import {
  registerMySafeDatePushDevice,
} from "../src/features/safedate/safeDatePush";
import { useAuth } from "../src/features/auth/AuthContext";
import {
  colors,
  radius,
  spacing,
} from "../src/theme/tokens";

export default function TrustedContactInviteScreen() {
  const router = useRouter();
  const { initialized, user } = useAuth();

  const params = useLocalSearchParams<{
    token?: string | string[];
  }>();

  const token = Array.isArray(params.token)
    ? params.token[0]
    : params.token;

  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!token || busy || !user) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await acceptSafeDateTrustedContactInvite(token);

      await registerMySafeDatePushDevice();

      setAccepted(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "BTME could not accept this SafeDate invite.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!initialized) {
    return (
      <View style={styles.page}>
        <Text style={styles.body}>
          Loading BTME™…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>
        BTME™ · SAFEDATE™
      </Text>

      <Text style={styles.title}>
        Trusted contact
      </Text>

      <Text style={styles.body}>
        A BTME™ member has invited you to be one of their
        SafeDate™ trusted contacts. SafeDate™ alerts never
        include their precise location.
      </Text>

      {!user ? (
        <>
          <Text style={styles.body}>
            Sign in to Better Than My Ex™, then reopen this
            invite link to accept it.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/welcome")}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              OPEN BTME™
            </Text>
          </Pressable>
        </>
      ) : accepted ? (
        <>
          <Text style={styles.success}>
            You're linked.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              CONTINUE
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accept SafeDate trusted contact invite"
          disabled={busy || !token}
          onPress={() => void accept()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {busy ? "LINKING…" : "ACCEPT INVITE"}
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  success: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  error: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
