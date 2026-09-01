import {
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useRouter,
} from 'expo-router';
import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

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
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';
import {
  useState,
} from 'react';

export default function LivenessScreen() {
  const router = useRouter();
  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [
    cameraReady,
    setCameraReady,
  ] = useState(false);

  const permissionGranted =
    permission?.granted === true;

  const permissionDenied =
    permission !== null &&
    permission.granted === false &&
    permission.canAskAgain === false;

  function continueCameraCheck() {
    if (!permissionGranted || !cameraReady) {
      return;
    }

    router.replace('/verified');
  }

  function openSettings() {
    void Linking.openSettings();
  }

  const footer = permissionGranted ? (
    <PrimaryButton
      label="Continue →"
      disabled={!cameraReady}
      onPress={continueCameraCheck}
    />
  ) : permissionDenied ? (
    <View style={styles.footerActions}>
      <PrimaryButton
        label="Open Settings"
        onPress={openSettings}
      />

      <TextButton
        label="Not now"
        onPress={() => router.back()}
      />
    </View>
  ) : (
    <PrimaryButton
      label="Allow camera →"
      onPress={() => {
        void requestPermission();
      }}
    />
  );

  return (
    <OnboardingScreen footer={footer}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          CAMERA CHECK
        </Text>

        <Text style={styles.title}>
          Show us it’s really you.
        </Text>

        <Text style={styles.body}>
          First, let’s get your camera ready for
          BTME™ identity and liveness verification.
        </Text>

        <View style={styles.cameraShell}>
          {permissionGranted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="front"
              mirror
              onCameraReady={() =>
                setCameraReady(true)
              }
            />
          ) : (
            <View style={styles.permissionState}>
              <View style={styles.cameraGlyph}>
                <Text style={styles.cameraGlyphText}>
                  ◉
                </Text>
              </View>

              <Text style={styles.permissionTitle}>
                Camera access needed
              </Text>

              <Text style={styles.permissionBody}>
                BTME™ needs camera access to show
                the live verification preview.
              </Text>
            </View>
          )}

          {permissionGranted && (
            <>
              <View
                pointerEvents="none"
                style={styles.cameraShade}
              />

              <View
                pointerEvents="none"
                style={styles.faceGuide}
              />

              <View
                pointerEvents="none"
                style={styles.cameraCopy}
              >
                <Text style={styles.cameraTitle}>
                  Position your face inside the frame
                </Text>

                <Text style={styles.cameraBody}>
                  Good lighting. No sunglasses.
                  Just you.
                </Text>
              </View>

              {!cameraReady && (
                <View style={styles.loadingState}>
                  <Text style={styles.loadingText}>
                    Starting camera…
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <Text style={styles.privacy}>
          This preview does not verify your identity
          or award a BTME Verified badge.
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
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.body,
  },

  cameraShell: {
    marginTop: spacing.xl,
    height: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },

  faceGuide: {
    position: 'absolute',
    top: 34,
    width: 176,
    height: 224,
    borderRadius: 88,
    borderWidth: 2,
    borderColor: colors.accent,
  },

  cameraCopy: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    alignItems: 'center',
  },

  cameraTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  cameraBody: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 4,
  },

  permissionState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },

  cameraGlyph: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraGlyphText: {
    color: colors.accent,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },

  permissionTitle: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },

  permissionBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  loadingState: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 5, 5, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textPrimary,
    ...typography.body,
  },

  privacy: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  footerActions: {
    gap: spacing.sm,
  },
});
