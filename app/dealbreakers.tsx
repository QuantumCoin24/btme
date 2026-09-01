import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  ChoicePill,
} from '../src/components/ChoicePill';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  DealBreaker,
  useCompatibility,
} from '../src/features/compatibility/CompatibilityContext';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

const options: Array<{
  value: DealBreaker;
  label: string;
}> = [
  {
    value: 'relationship-goals',
    label: 'Different relationship goals',
  },
  {
    value: 'smoking',
    label: 'Smoking',
  },
  {
    value: 'children',
    label: 'Different plans for children',
  },
  {
    value: 'distance',
    label: 'Long-distance only',
  },
  {
    value: 'non-monogamy',
    label: 'Non-monogamy',
  },
  {
    value: 'lifestyle',
    label: 'Major lifestyle mismatch',
  },
];

export default function DealbreakersScreen() {
  const router = useRouter();

  const {
    dealBreakers,
    toggleDealBreaker,
  } = useCompatibility();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Build my profile →"
          onPress={() =>
            router.push('/profile-preview')
          }
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          HARD DEAL-BREAKERS
        </Text>

        <Text style={styles.title}>
          What would make a match impossible?
        </Text>

        <Text style={styles.body}>
          Only choose genuine deal-breakers. These are different from preferences and can later exclude incompatible introductions.
        </Text>

        <View style={styles.warning}>
          <Text style={styles.warningTitle}>
            Hard means hard.
          </Text>

          <Text style={styles.warningBody}>
            Leaving everything unselected is completely fine.
          </Text>
        </View>

        <View style={styles.options}>
          {options.map((option) => (
            <View
              key={option.value}
              style={styles.optionItem}
            >
              <ChoicePill
                label={option.label}
                selected={
                  dealBreakers.includes(
                    option.value,
                  )
                }
                onPress={() =>
                  toggleDealBreaker(
                    option.value,
                  )
                }
              />
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          {dealBreakers.length} hard deal-breaker
          {dealBreakers.length === 1
            ? ''
            : 's'} selected
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
    marginBottom: spacing.md,
  },

  title: {
    color: colors.textPrimary,
    ...typography.title,
  },

  body: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.body,
  },

  warning: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  warningTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  warningBody: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  options: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },

  optionItem: {
    width: '100%',
  },

  note: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
