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

export default function AuthCodeScreen() {
  const router = useRouter();

  const {
    verifyOtp,
    requestOtp,
  } = useAuth();

  const {
    contactMethod,
    contact,
  } = useOnboarding();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] =
    useState(false);
  const [resending, setResending] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [notice, setNotice] =
    useState<string | null>(null);

  const trimmedContact = contact.trim();
  const trimmedCode = code.trim();

  const validCode =
    /^[0-9]{6,8}$/.test(trimmedCode);

  const maskedContact =
    contactMethod === 'email'
      ? trimmedContact.replace(
          /^(.{1,2})(.*)(@.*)$/,
          '$1••••$3',
        )
      : trimmedContact.length > 4
        ? `••••${trimmedContact.slice(-4)}`
        : trimmedContact;

  const handleVerify = async () => {
    if (
      !trimmedContact ||
      !validCode ||
      verifying
    ) {
      return;
    }

    setVerifying(true);
    setError(null);
    setNotice(null);

    try {
      await verifyOtp({
        channel: contactMethod,
        contact: trimmedContact,
        token: trimmedCode,
      });

      router.replace('/birthday');
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'That code could not be verified.';

      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!trimmedContact || resending) {
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      await requestOtp({
        channel: contactMethod,
        contact: trimmedContact,
      });

      setNotice(
        'A fresh verification code is on its way.',
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : 'We could not resend the code.';

      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <OnboardingScreen
      footer={
        <View style={styles.footer}>
          <PrimaryButton
            label={
              verifying
                ? 'Checking…'
                : 'Verify & continue →'
            }
            disabled={
              !validCode ||
              !trimmedContact ||
              verifying
            }
            onPress={() => {
              void handleVerify();
            }}
          />

          <Text
            accessibilityRole="button"
            onPress={() => {
              if (!resending) {
                void handleResend();
              }
            }}
            style={styles.resend}
          >
            {resending
              ? 'Sending…'
              : 'Send another code'}
          </Text>
        </View>
      }
    >
      <OnboardingHeader
        step={1}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          CHECK YOUR {contactMethod === 'email'
            ? 'EMAIL'
            : 'PHONE'}
        </Text>

        <Text style={styles.title}>
          Prove it’s really you.
        </Text>

        <Text style={styles.body}>
          Enter the one-time verification code sent to{' '}
          <Text style={styles.contact}>
            {maskedContact}
          </Text>
          .
        </Text>

        <View style={styles.input}>
          <FormInput
            autoComplete="one-time-code"
            keyboardType="number-pad"
            placeholder="123456"
            value={code}
            onChangeText={(value) => {
              setCode(
                value.replace(/[^0-9]/g, ''),
              );
              setError(null);
              setNotice(null);
            }}
          />
        </View>

        {notice ? (
          <Text style={styles.notice}>
            {notice}
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
  contact: {
    color: colors.textPrimary,
  },
  input: {
    marginTop: spacing.xl,
  },
  notice: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    gap: spacing.md,
  },
  resend: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
