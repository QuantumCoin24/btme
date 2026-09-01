import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

export default function NameScreen() {
  const router = useRouter();

  const {
    firstName,
    setFirstName,
  } = useOnboarding();

  const valid =
    firstName.trim().length >= 2;

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() => {
            if (valid) {
              router.push('/location');
            }
          }}
          style={{
            opacity: valid ? 1 : 0.45,
          }}
        />
      }
    >
      <OnboardingHeader
        step={3}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          NICE TO MEET YOU
        </Text>

        <Text style={styles.title}>
          What should we call you?
        </Text>

        <Text style={styles.body}>
          Your first name is shown to other members. Your surname stays private.
        </Text>

        <View style={styles.input}>
          <FormInput
            autoCapitalize="words"
            autoComplete="name-given"
            maxLength={40}
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
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
});
