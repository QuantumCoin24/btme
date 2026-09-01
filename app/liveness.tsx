import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  useProfile,
} from '../src/features/profile/ProfileContext';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function LivenessScreen() {
  const router = useRouter();

  const {
    setVerificationComplete,
  } = useProfile();

  function continueVerificationPreview() {
    // UI-flow placeholder only.
    // Genuine verification must later come from
    // the selected verification provider.
    setVerificationComplete(false);
    router.replace('/verified');
  }

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Start check →"
          onPress={continueVerificationPreview}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          QUICK CHECK
        </Text>

        <Text style={styles.title}>
          Show us it’s really you.
        </Text>

        <Text style={styles.body}>
          We’ll guide you through a quick face check so your profile can be matched to a real person.
        </Text>

        <View style={styles.camera}>
          <View style={styles.face}>
            <Text style={styles.faceText}>
              🙂
            </Text>
          </View>

          <Text style={styles.cameraTitle}>
            Position your face inside the frame
          </Text>

          <Text style={styles.cameraBody}>
            Good lighting. No sunglasses. Just you.
          </Text>
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

  camera: {
    marginTop: spacing.xl,
    minHeight: 300,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  face: {
    width: 150,
    height: 190,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  faceText: {
    fontSize: 52,
  },

  cameraTitle: {
    marginTop: spacing.xl,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },

  cameraBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
