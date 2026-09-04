import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppShellScreen } from "../../src/components/AppShellScreen";
import { useDiscovery } from "../../src/features/discovery/DiscoveryContext";
import { useFeedback } from "../../src/features/feedback/FeedbackContext";
import { colors, radius, spacing } from "../../src/theme/tokens";

export default function DatesScreen() {
  const router = useRouter();

  const { datePlans, getConnection } = useDiscovery();
  const { getReflectionForDatePlan } = useFeedback();

  return (
    <AppShellScreen
      eyebrow="DATES"
      title="From chemistry to real life."
      body="Your plans, your matches and SafeDate™ in one place."
    >
      {datePlans.length > 0 ? (
        <View style={styles.list}>
          {datePlans.map((plan) => {
            const connection = getConnection(plan.connectionId);

            if (!connection) {
              return null;
            }

            const reflection = getReflectionForDatePlan(plan.id);

            return (
              <View key={plan.id} style={styles.dateCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {connection.profile.accent}
                    </Text>
                  </View>

                  <View style={styles.identity}>
                    <Text style={styles.name}>
                      {connection.profile.firstName}
                    </Text>

                    <Text style={styles.compatibility}>
                      {connection.profile.compatibility}%{" compatibility"}
                    </Text>
                  </View>

                  <View style={styles.localBadge}>
                    <Text style={styles.localBadgeText}>PLANNED</Text>
                  </View>
                </View>

                <View style={styles.dateDetails}>
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>WHEN</Text>

                    <Text style={styles.detailValue}>{plan.day}</Text>

                    <Text style={styles.detailSecondary}>{plan.time}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>WHERE</Text>

                    <Text style={styles.detailValue}>{plan.place}</Text>
                  </View>
                </View>

                <Text style={styles.localDisclosure}>PRODUCTION DATE PLAN</Text>

                {reflection && (
                  <View style={styles.reflectionStatus}>
                    <View style={styles.reflectionDot} />

                    <View style={styles.reflectionCopy}>
                      <Text style={styles.reflectionTitle}>
                        Private reflection saved
                      </Text>

                      <Text style={styles.reflectionBody}>
                        Local only · not shared with{" "}
                        {connection.profile.firstName}
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open SafeDate for ${connection.profile.firstName}`}
                  onPress={() => router.push(`/safedate/${plan.id}` as never)}
                  style={({ pressed }) => [
                    styles.safeDateButton,
                    pressed && styles.safeDateButtonPressed,
                  ]}
                >
                  <Text style={styles.safeDateButtonText}>Open SafeDate™</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptySymbol}>◇</Text>

          <Text style={styles.emptyTitle}>
            Make plans worth showing up for.
          </Text>

          <Text style={styles.emptyBody}>
            When you create a date plan from Spark™, it will appear here.
          </Text>
        </View>
      )}

      <View style={styles.safeDateCard}>
        <Text style={styles.safeDateEyebrow}>SAFEDATE™</Text>

        <Text style={styles.safeDateTitle}>
          Safety without killing the vibe.
        </Text>

        <Text style={styles.safeDateBody}>
          SafeDate™ uses server-backed two-person state with independent
          end control. GPS sharing, trusted-contact alerts, background
          monitoring and emergency-service integration are not currently
          provided.
        </Text>

        <View style={styles.safeDateStatus}>
          <View style={styles.dot} />

          <Text style={styles.safeDateStatusText}>
            TWO-SIDED SAFETY STATE ACTIVE
          </Text>
        </View>
      </View>
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },

  dateCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  cardTop: {
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
    flex: 1,
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

  localBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },

  localBadgeText: {
    color: colors.accent,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  dateDetails: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },

  detail: {
    gap: 3,
  },

  detailLabel: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  detailValue: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },

  detailSecondary: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },

  localDisclosure: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  safeDateButton: {
    minHeight: 50,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  safeDateButtonPressed: {
    opacity: 0.72,
  },
  safeDateButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },
  emptyCard: {
    minHeight: 250,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  emptySymbol: {
    color: colors.accent,
    fontSize: 34,
    lineHeight: 40,
  },

  emptyTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyBody: {
    maxWidth: 290,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  reflectionStatus: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  reflectionDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  reflectionCopy: {
    marginLeft: spacing.sm,
    flex: 1,
  },

  reflectionTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },

  reflectionBody: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  safeDateCard: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  safeDateEyebrow: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  safeDateTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
  },

  safeDateBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },

  safeDateStatus: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },

  safeDateStatusText: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
