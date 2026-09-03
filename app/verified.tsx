import {
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';

import {
  useVerification,
  type VerificationStatus,
} from '../src/features/verification/VerificationContext';
import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

type Presentation = {
  eyebrow: string;
  title: string;
  body: string;
  status: string;
  action: string;
};

function presentationFor(
  status: VerificationStatus,
  verified: boolean,
): Presentation {
  if (verified) {
    return {
      eyebrow: 'BTME VERIFIED',
      title: 'You’re verified.',
      body:
        'Your identity verification has been confirmed by BTME™ trusted verification infrastructure.',
      status: 'IDENTITY VERIFIED',
      action: 'Continue →',
    };
  }

  if (status === 'pending') {
    return {
      eyebrow: 'VERIFICATION',
      title: 'Verification in progress.',
      body:
        'Your identity verification has been submitted and is waiting for a trusted result. BTME Verified status has not been awarded yet.',
      status: 'VERIFICATION PENDING',
      action: 'Refresh status',
    };
  }

  if (status === 'needs_review') {
    return {
      eyebrow: 'VERIFICATION',
      title: 'A review is needed.',
      body:
        'Your verification requires additional trusted review before BTME™ can award Verified status.',
      status: 'REVIEW REQUIRED',
      action: 'Refresh status',
    };
  }

  if (status === 'failed') {
    return {
      eyebrow: 'VERIFICATION',
      title: 'Not verified yet.',
      body:
        'Your latest trusted verification attempt was not successful. No BTME Verified badge has been awarded.',
      status: 'NOT VERIFIED',
      action: 'Continue',
    };
  }

  return {
    eyebrow: 'CAMERA READY',
    title: 'Camera check complete.',
    body:
      'Your front camera is ready for the future trusted identity and liveness flow. This camera preview did not verify your identity and did not award a BTME Verified badge.',
    status: 'IDENTITY NOT VERIFIED',
    action: 'Continue',
  };
}

export default function VerifiedScreen() {
  const {
    status,
    verified,
    loading,
    refreshVerification,
  } = useVerification();

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    refreshError,
    setRefreshError,
  ] = useState<string | null>(null);

  const presentation = presentationFor(
    status,
    verified,
  );

  const shouldRefresh =
    status === 'pending' ||
    status === 'needs_review';

  async function handlePrimaryAction() {
    if (!shouldRefresh) {
      router.push('/hero-photo');
      return;
    }

    setRefreshing(true);
    setRefreshError(null);

    try {
      await refreshVerification();
    } catch (error) {
      console.warn(
        '[BTME] Unable to refresh identity verification:',
        error instanceof Error
          ? error.message
          : String(error),
      );

      setRefreshError(
        'We could not refresh your verification status. Please try again.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>
          BETTER THAN MY EX™
        </Text>

        <Text style={styles.eyebrow}>
          {presentation.eyebrow}
        </Text>

        <Text style={styles.title}>
          {presentation.title}
        </Text>

        <Text style={styles.body}>
          {presentation.body}
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              {loading
                ? 'CHECKING VERIFICATION'
                : presentation.status}
            </Text>
          </View>

          <Text style={styles.statusBody}>
            Only a trusted server-side verification result can award BTME Verified status. Camera access alone is never treated as identity verification.
          </Text>
        </View>

        {refreshError ? (
          <Text style={styles.error}>
            {refreshError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={loading || refreshing}
          onPress={() => {
            void handlePrimaryAction();
          }}
          style={({ pressed }) => [
            styles.button,
            pressed &&
              !loading &&
              !refreshing &&
              styles.buttonPressed,
            (loading || refreshing) &&
              styles.buttonDisabled,
          ]}
        >
          {loading || refreshing ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>
              {presentation.action}
            </Text>
          )}
        </Pressable>

        {shouldRefresh ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push('/hero-photo');
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              Continue without Verified status
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  brand: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.6,
    lineHeight: 46,
  },
  body: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusDot: {
    backgroundColor: colors.accent,
    borderRadius: 5,
    height: 10,
    marginRight: spacing.sm,
    width: 10,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  statusBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  error: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
