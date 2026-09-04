import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  BrandMark,
} from '../src/components/BrandMark';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  Screen,
} from '../src/components/Screen';

import {
  TextButton,
} from '../src/components/TextButton';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.top}>
        <BrandMark compact />
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          BETTER DATING STARTS HERE
        </Text>

        <Text style={styles.title}>
          Ready for better?
        </Text>

        <Text style={styles.body}>
          Meet genuine people looking for something genuine.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="I'm ready ❤️‍🔥"
          onPress={() => router.push('/proposition')}
        />

        <TextButton
          label="Sign in"
          onPress={() => router.push('/join')}
        />

        <Text style={styles.legal}>
          By continuing, you agree to our Terms and acknowledge our Privacy and Safety policies.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingTop: spacing.sm,
    alignItems: 'center',
  },

  hero: {
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
    maxWidth: 340,
  },

  body: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.body,
    maxWidth: 340,
  },

  actions: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },

  legal: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
