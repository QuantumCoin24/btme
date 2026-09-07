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
  FormInput,
} from '../src/components/FormInput';
import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';
import {
  PrimaryButton,
} from '../src/components/PrimaryButton';
import {
  TextButton,
} from '../src/components/TextButton';
import {
  useAuth,
} from '../src/features/auth/AuthContext';
import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const {
    configured,
    requestPasswordReset,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] =
    useState(false);
  const [sent, setSent] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const normalizedEmail =
    email.trim().toLowerCase();

  const valid =
    EMAIL_PATTERN.test(normalizedEmail);

  const handleReset = async () => {
    if (!valid || submitting) {
      return;
    }

    if (!configured) {
      setError(
        'Password recovery is temporarily unavailable.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(
        normalizedEmail,
      );
      setSent(true);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'We could not send the recovery email.';

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingScreen
      footer={
        <View style={styles.footer}>
          {!sent ? (
            <PrimaryButton
              label={
                submitting
                  ? 'Sending…'
                  : 'Send recovery email →'
              }
              disabled={!valid || submitting}
              onPress={() => {
                void handleReset();
              }}
            />
          ) : null}

          <TextButton
            label="Back to sign in"
            onPress={() =>
              router.replace('/sign-in' as never)
            }
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          PASSWORD RECOVERY
        </Text>

        <Text style={styles.title}>
          Reset your password.
        </Text>

        <Text style={styles.body}>
          Enter the email linked to your BTME
          account. We’ll send you a secure recovery
          link.
        </Text>

        {!sent ? (
          <>
            <View style={styles.form}>
              <FormInput
                autoComplete="email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                }}
              />
            </View>

            {error ? (
              <Text
                accessibilityRole="alert"
                style={styles.error}
              >
                {error}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.success}>
            Check your email. Open the recovery link
            on this iPhone to choose a new password.
          </Text>
        )}
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
  form: {
    marginTop: spacing.xl,
  },
  error: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
  },
  success: {
    marginTop: spacing.xl,
    color: colors.textPrimary,
    ...typography.body,
  },
  footer: {
    gap: spacing.sm,
  },
});
