import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useState,
} from 'react';

import {
  useRouter,
} from 'expo-router';

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

function formatBirthDateInput(
  value: string,
) {
  const digits = value
    .replace(/\D/g, '')
    .slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBirthDate(value: string) {
  const match =
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date =
    new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isAtLeast18(date: Date) {
  const today = new Date();

  let age =
    today.getFullYear() -
    date.getFullYear();

  const monthDifference =
    today.getMonth() -
    date.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < date.getDate()
    )
  ) {
    age -= 1;
  }

  return age >= 18;
}

export default function BirthdayScreen() {
  const router = useRouter();

  const {
    birthDate,
    setBirthDate,
  } = useOnboarding();

  const [attempted, setAttempted] =
    useState(false);

  const parsed =
    parseBirthDate(birthDate);

  const oldEnough =
    parsed ? isAtLeast18(parsed) : false;

  const error =
    attempted && !parsed
      ? 'Enter a valid date as DD/MM/YYYY.'
      : attempted && !oldEnough
        ? 'BTME™ is strictly for adults aged 18+.'
        : undefined;

  function continueFlow() {
    setAttempted(true);

    if (!parsed || !oldEnough) {
      return;
    }

    router.push('/name');
  }

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={continueFlow}
        />
      }
    >
      <OnboardingHeader
        step={2}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          ADULTS ONLY
        </Text>

        <Text style={styles.title}>
          Birthday?
        </Text>

        <Text style={styles.body}>
          BTME™ is strictly 18+. Your full date of birth won’t appear on your profile.
        </Text>

        <View style={styles.input}>
          <FormInput
            error={error}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="DD/MM/YYYY"
            value={birthDate}
            onChangeText={(value) => {
              setAttempted(false);
              setBirthDate(
              formatBirthDateInput(value),
            );
            }}
          />
        </View>
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

  input: {
    marginTop: spacing.xl,
  },
});
