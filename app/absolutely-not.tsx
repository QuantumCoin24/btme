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
  PromptInputCard,
} from '../src/components/PromptInputCard';

import {
  useCompatibility,
} from '../src/features/compatibility/CompatibilityContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function AbsolutelyNotScreen() {
  const router = useRouter();

  const {
    absoluteNo,
    setAbsoluteNo,
  } = useCompatibility();

  const valid =
    absoluteNo.trim().length >= 6;

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          disabled={!valid}
          onPress={() => {
            if (valid) {
              router.push(
                '/quick-chemistry',
              );
            }
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          ABSOLUTELY NOT
        </Text>

        <Text style={styles.title}>
          What kills the vibe immediately?
        </Text>

        <Text style={styles.body}>
          This answer helps people understand you. Hard deal-breakers come next.
        </Text>

        <View style={styles.input}>
          <PromptInputCard
            value={absoluteNo}
            onChangeText={setAbsoluteNo}
            placeholder="Rudeness dressed up as confidence..."
          />
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xl,
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

  input: {
    marginTop: spacing.xl,
  },
});
