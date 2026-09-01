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
  LifestyleSignal,
  useCompatibility,
} from '../src/features/compatibility/CompatibilityContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const options: Array<{
  value: LifestyleSignal;
  label: string;
}> = [
  {
    value: 'social',
    label: 'Social butterfly',
  },
  {
    value: 'homebody',
    label: 'Cosy nights',
  },
  {
    value: 'fitness',
    label: 'Fitness',
  },
  {
    value: 'food',
    label: 'Food lover',
  },
  {
    value: 'travel',
    label: 'Travel',
  },
  {
    value: 'outdoors',
    label: 'Outdoors',
  },
  {
    value: 'culture',
    label: 'Culture',
  },
  {
    value: 'family',
    label: 'Family time',
  },
];

export default function LifestyleScreen() {
  const router = useRouter();

  const {
    lifestyleSignals,
    toggleLifestyleSignal,
  } = useCompatibility();

  const valid =
    lifestyleSignals.length >= 2;

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="That feels like me →"
          disabled={!valid}
          onPress={() => {
            if (valid) {
              router.push(
                '/perfect-sunday',
              );
            }
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          YOUR VIBE
        </Text>

        <Text style={styles.title}>
          What does your life actually look like?
        </Text>

        <Text style={styles.body}>
          Choose at least two. These are personality signals, not hard filters.
        </Text>

        <View style={styles.options}>
          {options.map((option) => (
            <View
              key={option.value}
              style={styles.optionItem}
            >
              <ChoicePill
                label={option.label}
                selected={
                  lifestyleSignals.includes(
                    option.value,
                  )
                }
                onPress={() =>
                  toggleLifestyleSignal(
                    option.value,
                  )
                }
              />
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          {lifestyleSignals.length} selected
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

  options: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  optionItem: {
    width: '48%',
    flexGrow: 1,
  },

  note: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
