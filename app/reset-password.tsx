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
  useAuth,
} from '../src/features/auth/AuthContext';
import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const {
    session,
    updatePassword,
  } = useAuth();

  const [password, setPassword] =
    useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const valid =
    password.length >= 8 &&
    password === confirmPassword;

  const handleUpdate = async () => {
    if (!valid || submitting) {
      return;
    }

    if (!session) {
      setError(
        'This recovery link is invalid or has expired.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updatePassword(password);
      router.replace('/' as never);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'We could not update your password.';

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
              ? 'Updating password…'
              : 'Save new password →'
          }
          disabled={!valid || submitting}
          onPress={() => {
            void handleUpdate();
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          SECURE YOUR ACCOUNT
        </Text>

        <Text style={styles.title}>
          Choose a new password.
        </Text>

        <Text style={styles.body}>
          Use at least 8 characters.
        </Text>

        <View style={styles.form}>
          <FormInput
            autoComplete="new-password"
            autoCapitalize="none"
            placeholder="New password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
          />

          <FormInput
            autoComplete="new-password"
            autoCapitalize="none"
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setError(null);
            }}
          />
        </View>

        {confirmPassword.length > 0 &&
        password !== confirmPassword ? (
          <Text style={styles.error}>
            Passwords do not match.
          </Text>
        ) : null}

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
  form: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  error: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
  },
});
