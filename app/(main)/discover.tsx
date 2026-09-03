import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppShellScreen } from "../../src/components/AppShellScreen";
import { useDiscovery } from "../../src/features/discovery/DiscoveryContext";
import { colors, radius, spacing } from "../../src/theme/tokens";

export default function DiscoverScreen() {
  const {
    currentProfile,
    introductions,
    likeCurrentProfile,
    passCurrentProfile,
  } = useDiscovery();

  return (
    <AppShellScreen
      eyebrow="DISCOVER"
      title="Someone better is out there."
      body="Introductions shaped around compatibility, intention and the things that actually matter."
    >
      {currentProfile ? (
        <>
          <View style={styles.card}>
            <View style={styles.photoStage}>
              <Text style={styles.photoInitial}>{currentProfile.accent}</Text>

              <View style={styles.compatibility}>
                <Text style={styles.compatibilityValue}>
                  {currentProfile.compatibility}%
                </Text>

                <Text style={styles.compatibilityLabel}>COMPATIBILITY</Text>
              </View>
            </View>

            <View style={styles.profileBody}>
              <Text style={styles.name}>
                {currentProfile.firstName}, {currentProfile.age}
              </Text>

              <Text style={styles.city}>{currentProfile.city}</Text>

              <Text style={styles.headline}>{currentProfile.headline}</Text>

              <View style={styles.divider} />

              <Text style={styles.promptLabel}>{currentProfile.prompt}</Text>

              <Text style={styles.promptAnswer}>
                {currentProfile.promptAnswer}
              </Text>

              <View style={styles.signals}>
                {currentProfile.compatibilitySignals.map((signal) => (
                  <View key={signal.label} style={styles.signal}>
                    <Text style={styles.signalLabel}>{signal.label}</Text>

                    <Text style={styles.signalDetail}>{signal.detail}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Pass on ${currentProfile.firstName}`}
              onPress={passCurrentProfile}
              style={({ pressed }) => [
                styles.action,
                styles.passAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.passSymbol}>×</Text>

              <Text style={styles.passLabel}>PASS</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Like ${currentProfile.firstName}`}
              onPress={likeCurrentProfile}
              style={({ pressed }) => [
                styles.action,
                styles.likeAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.likeSymbol}>♥</Text>

              <Text style={styles.likeLabel}>I LIKE THIS</Text>
            </Pressable>
          </View>

          <Text style={styles.remaining}>
            {introductions.length}{" "}
            {introductions.length === 1 ? "introduction" : "introductions"}{" "}
            available in this preview
          </Text>
        </>
      ) : (
        <View style={styles.complete}>
          <Text style={styles.completeHeart}>♥</Text>

          <Text style={styles.completeTitle}>You&apos;re all caught up.</Text>

          <Text style={styles.completeBody}>
            There are no more introductions for you right now.
          </Text>
        </View>
      )}
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  photoStage: {
    minHeight: 310,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  photoInitial: {
    color: colors.textPrimary,
    fontSize: 104,
    lineHeight: 112,
    fontWeight: "800",
    opacity: 0.12,
  },
  compatibility: {
    position: "absolute",
    left: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  compatibilityValue: {
    color: colors.accent,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
  },
  compatibilityLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  profileBody: {
    padding: spacing.lg,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  city: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  headline: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },
  promptLabel: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  promptAnswer: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 25,
  },
  signals: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  signal: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  signalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  signalDetail: {
    marginTop: 3,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    minHeight: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  passAction: {
    width: 86,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  likeAction: {
    flex: 1,
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.72,
  },
  passSymbol: {
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 25,
  },
  passLabel: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  likeSymbol: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 20,
  },
  likeLabel: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  remaining: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  complete: {
    minHeight: 390,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  completeHeart: {
    color: colors.accent,
    fontSize: 38,
    lineHeight: 44,
  },
  completeTitle: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  completeBody: {
    marginTop: spacing.sm,
    maxWidth: 280,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
