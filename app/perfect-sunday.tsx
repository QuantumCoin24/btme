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

export default function PerfectSundayScreen() {
  const router = useRouter();

  const {
    perfectSunday,
    setPerfectSunday,
  } = useCompatibility();

  const valid =
    perfectSunday.trim().length >= 10;

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          disabled={!valid}
          onPress={() => {
            if (valid) {
              router.push('/green-flag');
            }
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          PERFECT SUNDAY
        </Text>

        <Text style={styles.title}>
          Paint us the picture.
        </Text>

        <Text style={styles.body}>
          What does a genuinely great Sunday look like for you?
        </Text>

        <View style={styles.input}>
          <PromptInputCard
            value={perfectSunday}
            onChangeText={setPerfectSunday}
            placeholder="Coffee, a long walk, roast dinner, nowhere to rush to..."
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
