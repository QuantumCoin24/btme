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

export default function JoinScreen() {
  const router = useRouter();

  const {
    contactMethod,
    setContactMethod,
    contact,
    setContact,
  } = useOnboarding();

  const trimmed = contact.trim();

  const valid =
    contactMethod === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      : /^[0-9+\s()-]{7,20}$/.test(trimmed);

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() => router.push('/birthday')}
          style={{
            opacity: valid ? 1 : 0.45,
          }}
        />
      }
    >
      <OnboardingHeader
        step={1}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          FIRST THINGS FIRST
        </Text>

        <Text style={styles.title}>
          Where should we keep your account?
        </Text>

        <Text style={styles.body}>
          Your contact details stay private.
        </Text>

        <View style={styles.methodRow}>
          <ChoicePill
            label="Phone"
            selected={
              contactMethod === 'phone'
            }
            onPress={() => {
              setContactMethod('phone');
              setContact('');
            }}
          />

          <ChoicePill
            label="Email"
            selected={
              contactMethod === 'email'
            }
            onPress={() => {
              setContactMethod('email');
              setContact('');
            }}
          />
        </View>

        <FormInput
          autoComplete={
            contactMethod === 'email'
              ? 'email'
              : 'tel'
          }
          autoCapitalize="none"
          keyboardType={
            contactMethod === 'email'
              ? 'email-address'
              : 'phone-pad'
          }
          placeholder={
            contactMethod === 'email'
              ? 'you@example.com'
              : '+44 7700 900000'
          }
          value={contact}
          onChangeText={setContact}
        />

        <Text style={styles.note}>
          We’ll verify this later before your account becomes active.
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
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
  },

  methodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  note: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
