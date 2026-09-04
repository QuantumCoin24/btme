import {
  useState,
} from 'react';
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
  useAuth,
} from '../src/features/auth/AuthContext';
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
    configured,
    requestOtp,
  } = useAuth();

  const {
    contactMethod,
    setContactMethod,
    contact,
    setContact,
  } = useOnboarding();

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const trimmed = contact.trim();

  const valid =
    contactMethod === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      : /^[0-9+\s()-]{7,20}$/.test(trimmed);

  const handleContinue = async () => {
    if (!valid || submitting) {
      return;
    }

    if (!configured) {
      setError(
        'Account verification is temporarily unavailable.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestOtp({
        channel: contactMethod,
        contact: trimmed,
      });

      router.push('/auth-code' as never);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'We could not send your verification code.';

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label={
            submitting
              ? 'Sending code…'
              : 'Send verification code →'
          }
          disabled={!valid || submitting}
          onPress={() => {
            void handleContinue();
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
            label="Phone · coming soon"
            selected={false}
            onPress={() => {
              setContactMethod('email');
              setContact('');
              setError(
                'Phone verification is not available yet. Use email to continue.',
              );
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
              setError(null);
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
          onChangeText={(value) => {
            setContact(value);
            setError(null);
          }}
        />

        <Text style={styles.note}>
          We’ll send you a one-time code to verify your account.
        </Text>

        <Text style={styles.phoneNote}>
          Email verification is currently available.
          Phone verification will be enabled when BTME’s SMS delivery
          service is live.
        </Text>

        {error ? (
          <Text
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}
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
  phoneNote: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
  },
});
