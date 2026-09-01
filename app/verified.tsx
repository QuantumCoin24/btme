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
  spacing,
  typography,
} from '../src/theme/tokens';

export default function VerifiedScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Build my profile ❤️‍🔥"
          onPress={() =>
            router.push('/hero-photo')
          }
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.check}>
            ✓
          </Text>
        </View>

        <Text style={styles.eyebrow}>
          CHECK COMPLETE
        </Text>

        <Text style={styles.title}>
          Definitely you.
        </Text>

        <Text style={styles.body}>
          Welcome to verified dating.
        </Text>

        <Text style={styles.note}>
          Once identity verification is connected, successful members will receive the BTME Verified badge.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },

  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  check: {
    color: colors.textPrimary,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
  },

  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
    textAlign: 'center',
  },

  title: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    ...typography.display,
    textAlign: 'center',
  },

  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
    textAlign: 'center',
  },

  note: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
