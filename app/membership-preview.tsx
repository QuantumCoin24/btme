import { Pressable, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "../src/components/BrandMark";
import { OnboardingScreen } from "../src/components/OnboardingScreen";
import { useMembership } from "../src/features/membership/MembershipContext";
import { colors, radius, spacing, typography } from "../src/theme/tokens";

const planLabels = {
  monthly: "Monthly",
  "six-month": "6 Months",
  annual: "Annual",
} as const;

export default function MembershipPreviewScreen() {
  const {
    selectedPlan,
    accessState,
    loading,
    error,
    hasActiveMembership,
    isVerified,
    canDate,
    accessMessage,
    refreshMembership,
  } = useMembership();

  const plan = selectedPlan ? planLabels[selectedPlan] : "No plan selected";

  return (
    <OnboardingScreen>
      <View style={styles.content}>
        <BrandMark compact />

        <Text style={styles.eyebrow}>MEMBERSHIP PREVIEW</Text>

        <Text style={styles.title}>You’re ready for better.</Text>

        <Text style={styles.body}>
          Your profile foundation and membership preference are ready for the
          next phase.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SELECTED BILLING PERIOD</Text>

          <Text style={styles.plan}>{plan}</Text>

          <View style={styles.divider} />

          <Text style={styles.cardTitle}>
            Your selected billing period is a preference until a trusted store
            purchase is verified.
          </Text>

          <Text style={styles.cardBody}>
            This build records only the local plan selection for UX development.
            It does not activate membership, charge the user or create a
            subscription.
          </Text>
        </View>

        <View style={styles.next}>
          <Text style={styles.nextTitle}>What comes next</Text>

          <Text style={styles.nextBody}>
            Trusted entitlement status state and the main BTME experience will
            be connected in later builds.
          </Text>
        </View>
      </View>

      <View style={styles.accessCard}>
        <Text style={styles.accessEyebrow}>AUTHORITATIVE ACCESS STATE</Text>

        <Text style={styles.accessTitle}>
          {loading
            ? "Checking access…"
            : canDate
              ? "Verified Premium active"
              : accessMessage}
        </Text>

        <Text style={styles.accessBody}>
          Verification: {isVerified ? "VERIFIED" : "NOT VERIFIED"}
        </Text>

        <Text style={styles.accessBody}>
          Membership:{" "}
          {hasActiveMembership ? "ACTIVE PREMIUM" : "NO ACTIVE PREMIUM"}
        </Text>

        {accessState?.entitlementStatus ? (
          <Text style={styles.accessBody}>
            Entitlement status: {accessState.entitlementStatus}
          </Text>
        ) : null}

        {error ? <Text style={styles.accessError}>{error}</Text> : null}

        <Pressable
          onPress={() => {
            void refreshMembership();
          }}
        >
          <Text style={styles.refresh}>Refresh access state</Text>
        </Pressable>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  accessCard: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  accessEyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
  },
  accessTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    ...typography.heading,
  },
  accessBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    ...typography.body,
  },
  accessError: {
    marginTop: spacing.sm,
    color: colors.accent,
    ...typography.body,
  },
  refresh: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    ...typography.eyebrow,
  },

  title: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    ...typography.title,
  },

  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
  },

  card: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },

  cardLabel: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 1.6,
  },

  plan: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
  },

  cardBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },

  next: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  nextTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },

  nextBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
