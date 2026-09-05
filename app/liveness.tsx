import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Platform,
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
import BtmeLiveVerification from '../modules/my-module/src/BtmeLiveVerificationModule';
import type {
  FaceAnalysis,
} from '../modules/my-module/src/BtmeLiveVerification.types';
import {
  completeLiveSelfieChallenge,
  startLiveSelfieChallenge,
  type LiveSelfieChallenge,
  type LiveSelfieEvidence,
  type LiveSelfieStep,
} from '../src/features/verification/liveSelfieVerification';
import {
  useVerification,
} from '../src/features/verification/VerificationContext';
import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

const CAPTURE_DELAY_MS = 650;
const RETRY_DELAY_MS = 700;
const MAX_ATTEMPTS_PER_STEP = 12;

function stepTitle(step: LiveSelfieStep): string {
  if (step === 'neutral') {
    return 'LOOK STRAIGHT';
  }

  if (step === 'turn_left') {
    return 'TURN YOUR HEAD';
  }

  return 'TURN THE OTHER WAY';
}

function stepInstruction(step: LiveSelfieStep): string {
  if (step === 'neutral') {
    return 'Look directly at the camera and hold still.';
  }

  if (step === 'turn_left') {
    return 'Slowly turn your head to one side and hold.';
  }

  return 'Now turn your head to the other side and hold.';
}

function analysisPass(
  step: LiveSelfieStep,
  analysis: FaceAnalysis,
): boolean {
  if (
    !analysis.hasSingleFace ||
    analysis.faceCount !== 1 ||
    analysis.captureQuality === null ||
    analysis.captureQuality < 0.35 ||
    analysis.width === null ||
    analysis.height === null ||
    analysis.width < 0.20 ||
    analysis.height < 0.20 ||
    analysis.centerX === null ||
    analysis.centerY === null ||
    analysis.centerX < 0.25 ||
    analysis.centerX > 0.75 ||
    analysis.centerY < 0.20 ||
    analysis.centerY > 0.80 ||
    analysis.yaw === null
  ) {
    return false;
  }

  if (step === 'neutral') {
    return Math.abs(analysis.yaw) <= 0.22;
  }

  if (step === 'turn_left') {
    return analysis.yaw <= -0.20;
  }

  return analysis.yaw >= 0.20;
}

function evidenceFrom(
  step: LiveSelfieStep,
  analysis: FaceAnalysis,
): LiveSelfieEvidence {
  if (
    analysis.captureQuality === null ||
    analysis.yaw === null ||
    analysis.width === null ||
    analysis.height === null ||
    analysis.centerX === null ||
    analysis.centerY === null
  ) {
    throw new Error(
      'Incomplete live-selfie evidence.',
    );
  }

  return {
    step,
    faceCount: analysis.faceCount,
    captureQuality: analysis.captureQuality,
    yaw: analysis.yaw,
    width: analysis.width,
    height: analysis.height,
    centerX: analysis.centerX,
    centerY: analysis.centerY,
  };
}

function retryMessage(
  step: LiveSelfieStep,
  analysis: FaceAnalysis,
): string {
  if (analysis.faceCount === 0) {
    return 'Move your face into the guide.';
  }

  if (analysis.faceCount > 1) {
    return 'Only one person can be in frame.';
  }

  if (
    analysis.captureQuality === null ||
    analysis.captureQuality < 0.35
  ) {
    return 'Hold still and use better lighting.';
  }

  if (
    analysis.width !== null &&
    analysis.width < 0.20
  ) {
    return 'Move a little closer.';
  }

  if (step === 'neutral') {
    return 'Look straight at the camera.';
  }

  return 'Turn a little further and hold.';
}

export default function LivenessScreen() {
  const router = useRouter();
  const cameraRef =
    useRef<CameraView | null>(null);
  const runTokenRef = useRef(0);

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [
    cameraReady,
    setCameraReady,
  ] = useState(false);

  const [
    challenge,
    setChallenge,
  ] =
    useState<LiveSelfieChallenge | null>(
      null,
    );

  const [
    stepIndex,
    setStepIndex,
  ] = useState(0);

  const [
    evidence,
    setEvidence,
  ] =
    useState<LiveSelfieEvidence[]>([]);

  const [
    statusText,
    setStatusText,
  ] = useState(
    'Preparing secure live-selfie check…',
  );

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const {
    refreshVerification,
  } = useVerification();

  const supported =
    Platform.OS === 'ios';

  const permissionGranted =
    permission?.granted === true;

  const permissionDenied =
    permission !== null &&
    permission.granted === false &&
    permission.canAskAgain === false;

  const currentStep =
    challenge?.sequence[stepIndex] ??
    null;

  const delay = useCallback(
    (milliseconds: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, milliseconds);
      }),
    [],
  );

  const captureAnalysis =
    useCallback(async () => {
      if (!cameraRef.current) {
        throw new Error(
          'Camera is not ready.',
        );
      }

      const picture =
        await cameraRef.current
          .takePictureAsync({
            quality: 0.72,
            base64: false,
            exif: false,
            shutterSound: false,
          });

      let temporaryUri:
        | string
        | null = picture.uri;

      try {
        const analysis =
          await BtmeLiveVerification
            .analyseFace(picture.uri);

        temporaryUri = null;

        return analysis;
      } finally {
        if (temporaryUri) {
          try {
            await BtmeLiveVerification
              .deleteTemporaryImage(
                temporaryUri,
              );
          } catch {
            console.warn(
              '[BTME] Temporary verification image cleanup failed.',
            );
          }
        }
      }
    }, []);

  const runVerification =
    useCallback(async () => {
      if (
        !supported ||
        !permissionGranted ||
        !cameraReady ||
        running ||
        completed
      ) {
        return;
      }

      const token =
        runTokenRef.current + 1;

      runTokenRef.current = token;

      setRunning(true);
      setError(null);
      setEvidence([]);
      setStepIndex(0);

      try {
        setStatusText(
          'Creating your secure challenge…',
        );

        const issued =
          await startLiveSelfieChallenge();

        if (
          runTokenRef.current !== token
        ) {
          return;
        }

        setChallenge(issued);

        const collected:
          LiveSelfieEvidence[] = [];

        for (
          let index = 0;
          index < issued.sequence.length;
          index += 1
        ) {
          const step =
            issued.sequence[index];

          setStepIndex(index);
          setStatusText(
            stepInstruction(step),
          );

          await delay(CAPTURE_DELAY_MS);

          let accepted:
            LiveSelfieEvidence | null =
              null;

          for (
            let attempt = 0;
            attempt <
            MAX_ATTEMPTS_PER_STEP;
            attempt += 1
          ) {
            if (
              runTokenRef.current !== token
            ) {
              return;
            }

            const analysis =
              await captureAnalysis();

            if (
              analysisPass(
                step,
                analysis,
              )
            ) {
              accepted =
                evidenceFrom(
                  step,
                  analysis,
                );
              break;
            }

            setStatusText(
              retryMessage(
                step,
                analysis,
              ),
            );

            await delay(
              RETRY_DELAY_MS,
            );
          }

          if (!accepted) {
            throw new Error(
              'We could not confirm that movement. Keep your face inside the guide and try again.',
            );
          }

          collected.push(accepted);
          setEvidence([...collected]);

          if (
            index <
            issued.sequence.length - 1
          ) {
            setStatusText(
              'Perfect. Next movement…',
            );
            await delay(500);
          }
        }

        setStatusText(
          'Confirming with BTME™…',
        );

        await completeLiveSelfieChallenge(
          issued,
          collected,
        );

        await refreshVerification();

        if (
          runTokenRef.current !== token
        ) {
          return;
        }

        setCompleted(true);
        setStatusText(
          'Live Selfie Verified ✓',
        );

        await delay(650);

        router.replace(
          '/verified' as never,
        );
      } catch (caught) {
        console.warn(
          '[BTME] Live selfie verification failed:',
          caught instanceof Error
            ? caught.message
            : String(caught),
        );

        setError(
          caught instanceof Error &&
            caught.message
            ? caught.message
            : 'We could not complete the live-selfie check. Please try again.',
        );

        setStatusText(
          'Ready to try again.',
        );
      } finally {
        if (
          runTokenRef.current === token
        ) {
          setRunning(false);
        }
      }
    }, [
      cameraReady,
      captureAnalysis,
      completed,
      delay,
      permissionGranted,
      refreshVerification,
      router,
      running,
      supported,
    ]);

  useEffect(() => {
    if (
      !supported ||
      !permissionGranted ||
      !cameraReady ||
      running ||
      completed
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void runVerification();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [
    cameraReady,
    completed,
    permissionGranted,
    runVerification,
    running,
    supported,
  ]);

  useEffect(
    () => () => {
      runTokenRef.current += 1;
    },
    [],
  );

  function openSettings() {
    void Linking.openSettings();
  }

  const footer = !supported ? (
    <TextButton
      label="Go back"
      onPress={() => router.back()}
    />
  ) : !permissionGranted ? (
    permissionDenied ? (
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
    )
  ) : error && !running ? (
    <PrimaryButton
      label="Try again →"
      onPress={() => {
        setError(null);
        setChallenge(null);
        setCompleted(false);
        void runVerification();
      }}
    />
  ) : (
    <TextButton
      label="Cancel"
      onPress={() => router.back()}
    />
  );

  return (
    <OnboardingScreen footer={footer}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          BTME LIVE VERIFIED
        </Text>

        <Text style={styles.title}>
          Just you. Just live.
        </Text>

        <Text style={styles.body}>
          Keep your face inside the guide.
          BTME™ will automatically guide you
          through a few quick movements.
        </Text>

        <View style={styles.cameraShell}>
          {supported &&
          permissionGranted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              mirror
              mode="picture"
              onCameraReady={() => {
                setCameraReady(true);
              }}
              onMountError={(event) => {
                setCameraReady(false);
                setError(
                  event.message ||
                    'The camera could not start.',
                );
              }}
            />
          ) : (
            <View
              style={styles.permissionState}
            >
              <View
                style={styles.cameraGlyph}
              >
                <Text
                  style={
                    styles.cameraGlyphText
                  }
                >
                  ◉
                </Text>
              </View>

              <Text
                style={
                  styles.permissionTitle
                }
              >
                {supported
                  ? 'Camera access needed'
                  : 'iPhone required'}
              </Text>

              <Text
                style={
                  styles.permissionBody
                }
              >
                {supported
                  ? 'BTME™ uses the front camera for your live-selfie check.'
                  : 'BTME™ Live Selfie Verification is currently available on iPhone.'}
              </Text>
            </View>
          )}

          {supported &&
          permissionGranted ? (
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
                <Text
                  style={
                    styles.challengeCount
                  }
                >
                  {completed
                    ? 'COMPLETE'
                    : challenge
                      ? `STEP ${Math.min(
                          stepIndex + 1,
                          challenge.sequence
                            .length,
                        )} OF ${
                          challenge.sequence
                            .length
                        }`
                      : 'GET READY'}
                </Text>

                <Text
                  style={styles.cameraTitle}
                >
                  {completed
                    ? 'YOU’RE LIVE ✓'
                    : currentStep
                      ? stepTitle(
                          currentStep,
                        )
                      : 'HOLD STILL'}
                </Text>

                <Text
                  style={styles.cameraBody}
                >
                  {statusText}
                </Text>
              </View>

              {!cameraReady ? (
                <View
                  style={
                    styles.loadingState
                  }
                >
                  <Text
                    style={
                      styles.loadingText
                    }
                  >
                    Starting camera…
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        {running && evidence.length > 0 ? (
          <Text style={styles.progress}>
            {evidence.length} movement
            {evidence.length === 1
              ? ''
              : 's'}{' '}
            confirmed
          </Text>
        ) : null}

        <Text style={styles.privacy}>
          Verification frames are analysed
          on this device and deleted after
          analysis. BTME™ receives only the
          challenge result and measurements
          required to validate the check.
        </Text>

        <Text style={styles.authority}>
          Live Selfie Verified confirms that
          you completed BTME™’s live-camera
          challenge. It does not verify your
          legal identity, name, date of birth
          or government ID.
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
    backgroundColor:
      'rgba(0, 0, 0, 0.12)',
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
  challengeCount: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  cameraTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor:
      'rgba(0, 0, 0, 0.9)',
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
    textShadowColor:
      'rgba(0, 0, 0, 0.9)',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0, 0, 0, 0.45)',
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  progress: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  privacy: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  authority: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },
  footerActions: {
    gap: spacing.sm,
  },
});
