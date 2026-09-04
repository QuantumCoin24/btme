import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  BrandMark,
} from '../src/components/BrandMark';
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

const benefits = [
  {
    title: 'Verification-first dating',
    body: 'Built for a community of genuine people.',
  },
  {
    title: 'Better compatibility',
    body: 'Your preferences and chemistry signals actually matter.',
  },
  {
    title: 'Intentional matchmaking',
    body: 'Designed for better introductions, not endless attention.',
  },
  {
    title: 'Safer dates',
    body: 'SafeDate™ provides server-backed, independent two-person safety state for first dates.',
  },
] as const;

export default function MembershipScreen() {
  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="See membership →"
          onPress={() =>
            router.push('/choose-membership')
          }
        />
      }
    >
      <View style={styles.content}>
        <BrandMark compact />

        <Text style={styles.eyebrow}>
          BTME MEMBERSHIP
        </Text>

        <Text style={styles.title}>
          Better dating starts here.
        </Text>

        <Text style={styles.body}>
          One premium membership. No popularity
          contests. No paying to buy somebody’s
          attention.
        </Text>

        <View style={styles.statement}>
          <Text style={styles.statementLead}>
            Find better.
          </Text>
          <Text style={styles.statementLead}>
            Date better.
          </Text>
          <Text style={styles.statementAccent}>
            Love better.™
          </Text>
        </View>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View
              key={benefit.title}
              style={styles.benefit}
            >
              <View style={styles.check}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>

              <View style={styles.benefitCopy}>
                <Text style={styles.benefitTitle}>
                  {benefit.title}
                </Text>
                <Text style={styles.benefitBody}>
                  {benefit.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          Membership is purchased securely through Apple.
          Your dating access activates only after BTME
          verifies the entitlement.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.lg,
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

  statement: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },

  statementLead: {
    color: colors.textPrimary,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  statementAccent: {
    color: colors.accent,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  benefits: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },

  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  benefitCopy: {
    flex: 1,
  },

  benefitTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  benefitBody: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },

  note: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
