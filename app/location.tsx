import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ChoicePill,
} from '../src/components/ChoicePill';

import {
  FormInput,
} from '../src/components/FormInput';

import {
  OnboardingHeader,
} from '../src/components/OnboardingHeader';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  useOnboarding,
} from '../src/features/onboarding/OnboardingContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const distances = [
  10,
  25,
  50,
  100,
] as const;

export default function LocationScreen() {
  const {
    city,
    setCity,
    distance,
    setDistance,
  } = useOnboarding();

  const valid =
    city.trim().length >= 2;

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Use this location ❤️‍🔥"
          onPress={() => {}}
          style={{
            opacity: valid ? 1 : 0.45,
          }}
        />
      }
    >
      <OnboardingHeader
        step={4}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          YOUR DATING AREA
        </Text>

        <Text style={styles.title}>
          Where are you dating?
        </Text>

        <Text style={styles.body}>
          We’ll show an approximate area to members — never your precise position.
        </Text>

        <View style={styles.input}>
          <FormInput
            autoCapitalize="words"
            placeholder="Manchester"
            value={city}
            onChangeText={setCity}
          />
        </View>

        <Text style={styles.question}>
          How far would you travel for someone worth meeting?
        </Text>

        <View style={styles.distanceRow}>
          {distances.map((value) => (
            <ChoicePill
              key={value}
              label={
                value === 100
                  ? '100+'
                  : `${value}`
              }
              selected={
                distance === value
              }
              onPress={() =>
                setDistance(value)
              }
            />
          ))}
        </View>

        <Text style={styles.unit}>
          miles
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
    ...typography.title,
  },

  body: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.body,
  },

  input: {
    marginTop: spacing.xl,
  },

  question: {
    marginTop: spacing.xl,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },

  distanceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },

  unit: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
});
