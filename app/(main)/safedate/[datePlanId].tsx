import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDiscovery } from "../../../src/features/discovery/DiscoveryContext";
import { useSafeDate } from "../../../src/features/safedate/SafeDateContext";
import { colors, radius, spacing } from "../../../src/theme/tokens";

export default function SafeDateScreen() {
  const router = useRouter();

  const { datePlanId: rawDatePlanId } = useLocalSearchParams<{
    datePlanId?: string | string[];
  }>();

  const datePlanId = Array.isArray(rawDatePlanId)
    ? rawDatePlanId[0]
    : rawDatePlanId;

  const { datePlans, getConnection } = useDiscovery();

  const {
    getSessionForDatePlan,
    loadSessionForDatePlan,
    startSession,
    endMySide,
    isLoadingSession,
    isMutatingSession,
    safeDateError,
  } = useSafeDate();

  const plan = datePlans.find((item) => item.id === datePlanId) ?? null;

  const connection = plan ? getConnection(plan.connectionId) : null;

  const session = datePlanId ? getSessionForDatePlan(datePlanId) : null;

  useEffect(() => {
    if (datePlanId) {
      void loadSessionForDatePlan(datePlanId);
    }
  }, [datePlanId, loadSessionForDatePlan]);

  if (!plan || !connection) {
    return (
      <View style={styles.screen}>
        <View style={styles.missingWrap}>
          <Text style={styles.eyebrow}>SAFEDATE™</Text>

          <Text style={styles.missingTitle}>Date plan unavailable.</Text>

          <Text style={styles.body}>
            SafeDate™ needs an existing production date plan.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isEnded = session?.status === "ended";

  const mySideEnded = Boolean(session?.mySideEnded);

  async function handleStart() {
    if (!plan || isMutatingSession) {
      return;
    }

    await startSession(plan.id);
  }

  async function handleEnd() {
    if (!plan || !session || mySideEnded || isMutatingSession) {
      return;
    }

    await endMySide(plan.id);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.brand}>
            <Text style={styles.heart}>♥</Text>

            <Text style={styles.brandText}>BTME™</Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>SAFEDATE™</Text>

        <Text style={styles.title}>Your side. Your safety.</Text>

        <Text style={styles.body}>
          Each person controls their own SafeDate™ side independently. Neither
          person can end the other person’s side.
        </Text>

        <View style={styles.dateCard}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{connection.profile.accent}</Text>
            </View>

            <View style={styles.identity}>
              <Text style={styles.name}>{connection.profile.firstName}</Text>

              <Text style={styles.compatibility}>
                {connection.profile.compatibility}% compatibility
              </Text>
            </View>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>WHEN</Text>

            <Text style={styles.detailValue}>{plan.day}</Text>

            <Text style={styles.detailSecondary}>{plan.time}</Text>

            <View style={styles.divider} />

            <Text style={styles.detailLabel}>WHERE</Text>

            <Text style={styles.detailValue}>{plan.place}</Text>
          </View>

          <Text style={styles.disclosure}>PRODUCTION DATE PLAN</Text>
        </View>

        <View style={styles.safetyCard}>
          <Text style={styles.safetyEyebrow}>SAFETY BOUNDARY</Text>

          <Text style={styles.safetyTitle}>Server-backed safety state.</Text>

          <Text style={styles.safetyBody}>
            This build does not yet provide GPS sharing, trusted-contact alerts,
            background monitoring or emergency-service integration.
          </Text>
        </View>

        {isLoadingSession && !session ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Loading SafeDate™…</Text>

            <Text style={styles.actionBody}>
              Checking the current safety state for this date.
            </Text>
          </View>
        ) : !session ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Start SafeDate™</Text>

            <Text style={styles.actionBody}>
              Starting creates the shared two-person SafeDate™ session. Each
              person still controls only their own side.
            </Text>

            {safeDateError ? (
              <Text style={styles.body}>{safeDateError}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start SafeDate"
              disabled={isMutatingSession}
              onPress={() => void handleStart()}
              style={({ pressed }) => [
                styles.primaryButton,
                isMutatingSession && styles.disabledButton,
                pressed && !isMutatingSession && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isMutatingSession ? "Starting…" : "Start SafeDate™"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionCard}>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, isEnded && styles.statusDotEnded]}
              />

              <Text style={styles.statusText}>
                {isEnded
                  ? "SAFEDATE™ CLOSED"
                  : mySideEnded
                    ? "YOUR SIDE ENDED · OTHER SIDE OPEN"
                    : "YOUR SAFEDATE™ ACTIVE"}
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              {isEnded
                ? "Both sides are closed."
                : mySideEnded
                  ? "Your side is closed."
                  : "Your side is active."}
            </Text>

            <Text style={styles.actionBody}>
              {isEnded
                ? "Both people independently ended their side, so the shared SafeDate™ session is closed."
                : mySideEnded
                  ? `${connection.profile.firstName} keeps independent control of their side. The shared session stays open until they end it.`
                  : `${connection.profile.firstName} cannot switch your side off, and you cannot switch off theirs.`}
            </Text>

            {safeDateError ? (
              <Text style={styles.body}>{safeDateError}</Text>
            ) : null}

            {isEnded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reflect privately on your date with ${connection.profile.firstName}`}
                onPress={() => router.push(`/feedback/${plan.id}` as never)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Reflect on the date
                </Text>
              </Pressable>
            ) : !mySideEnded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="End my side of SafeDate"
                disabled={isMutatingSession}
                onPress={() => void handleEnd()}
                style={({ pressed }) => [
                  styles.endButton,
                  isMutatingSession && styles.disabledButton,
                  pressed && !isMutatingSession && styles.buttonPressed,
                ]}
              >
                <Text style={styles.endButtonText}>
                  {isMutatingSession ? "Updating…" : "End my side"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={styles.footerDisclosure}>
          SAFEDATE™ · SERVER-BACKED STATE · INDEPENDENT END CONTROL · NO GPS ·
          NO EMERGENCY-SERVICE INTEGRATION
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    marginTop: -3,
    color: colors.textPrimary,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "400",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heart: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 21,
  },
  brandText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
  title: {
    maxWidth: 330,
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  body: {
    maxWidth: 340,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  dateCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  identity: {
    marginLeft: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },
  compatibility: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
  },
  detailBlock: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  detailLabel: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  detailValue: {
    marginTop: 3,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
  detailSecondary: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  disclosure: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  safetyCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  safetyEyebrow: {
    color: colors.warning,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  safetyTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
  },
  safetyBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  actionCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  actionBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  statusRow: {
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusDotEnded: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  primaryButton: {
    minHeight: 54,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },
  endButton: {
    minHeight: 50,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 52,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  footerDisclosure: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  missingWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  missingTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
});
