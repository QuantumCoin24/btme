import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function VerifyScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Verify me →"
          onPress={() =>
            router.push('/liveness')
          }
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          VERIFIED DATING
        </Text>

        <Text style={styles.title}>
          Real people are hotter.
        </Text>

        <Text style={styles.body}>
          Everyone on BTME™ verifies they’re genuinely them before joining the community.
        </Text>

        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              ✓
            </Text>
          </View>

          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>
              BTME Verified
            </Text>

            <Text style={styles.cardBody}>
              A quick identity and liveness check helps keep fake profiles and catfishing out.
            </Text>
          </View>
        </View>

        <Text style={styles.privacy}>
          Verification data will be handled separately from your public dating profile.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },

  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
    marginBottom: spacing.md,
  },

  title: {
    color: colors.textPrimary,
    ...typography.display,
  },

  body: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.body,
  },

  card: {
    marginTop: spacing.xl,
    minHeight: 118,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
  },

  cardCopy: {
    flex: 1,
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },

  cardBody: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  privacy: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
