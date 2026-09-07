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

export default function SignInScreen() {
  const router = useRouter();
  const {
    configured,
    signInWithPassword,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const normalizedEmail =
    email.trim().toLowerCase();

  const valid =
    EMAIL_PATTERN.test(normalizedEmail) &&
    password.length > 0;

  const handleSignIn = async () => {
    if (!valid || submitting) {
      return;
    }

    if (!configured) {
      setError(
        'Sign in is temporarily unavailable.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signInWithPassword({
        email: normalizedEmail,
        password,
      });

      router.replace('/' as never);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'We could not sign you in.';

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingScreen
      footer={
        <View style={styles.footer}>
          <PrimaryButton
            label={
              submitting
                ? 'Signing in…'
                : 'Sign in →'
            }
            disabled={!valid || submitting}
            onPress={() => {
              void handleSignIn();
            }}
          />

          <TextButton
            label="New here? Create an account"
            onPress={() =>
              router.replace('/join' as never)
            }
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          WELCOME BACK
        </Text>

        <Text style={styles.title}>
          Sign in.
        </Text>

        <Text style={styles.body}>
          Pick up exactly where you left off.
        </Text>

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

          <FormInput
            autoComplete="current-password"
            autoCapitalize="none"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
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
  footer: {
    gap: spacing.sm,
  },
});
