import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  colors,
  spacing,
  typography,
} from '../theme/tokens';

type OnboardingHeaderProps = {
  step: number;
  totalSteps?: number;
  showBack?: boolean;
};

export function OnboardingHeader({
  step,
  totalSteps = 4,
  showBack = true,
}: OnboardingHeaderProps) {
  const router = useRouter();

  const progress =
    Math.min(Math.max(step / totalSteps, 0), 1) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.back}>
              ←
            </Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <Text style={styles.brand}>
          BTME™
        </Text>

        <Text style={styles.step}>
          {step}/{totalSteps}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            {
              width: `${progress}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
  },

  row: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 48,
    minHeight: 42,
    justifyContent: 'center',
  },

  back: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 32,
  },

  brand: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  step: {
    width: 48,
    color: colors.textMuted,
    textAlign: 'right',
    ...typography.eyebrow,
    letterSpacing: 1.2,
  },

  track: {
    height: 3,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },

  progress: {
    height: '100%',
    backgroundColor: colors.accent,
  },
});
