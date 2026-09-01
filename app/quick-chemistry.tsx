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
  SelectionCard,
} from '../src/components/SelectionCard';

import {
  ChemistryStyle,
  useCompatibility,
} from '../src/features/compatibility/CompatibilityContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const options: Array<{
  value: ChemistryStyle;
  title: string;
  body: string;
}> = [
  {
    value: 'banter',
    title: 'Make me laugh',
    body: 'Playful chemistry and effortless banter.',
  },
  {
    value: 'deep-talk',
    title: 'Talk until 2am',
    body: 'Depth, curiosity and conversations that go somewhere.',
  },
  {
    value: 'affection',
    title: 'Warm and affectionate',
    body: 'Kindness, closeness and feeling genuinely wanted.',
  },
  {
    value: 'adventure',
    title: 'Let’s go somewhere',
    body: 'Spontaneity, energy and doing things together.',
  },
];

export default function QuickChemistryScreen() {
  const router = useRouter();

  const {
    chemistryStyle,
    setChemistryStyle,
  } = useCompatibility();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="That’s my chemistry →"
          disabled={!chemistryStyle}
          onPress={() => {
            if (chemistryStyle) {
              router.push('/dealbreakers');
            }
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          QUICK CHEMISTRY
        </Text>

        <Text style={styles.title}>
          What pulls you in first?
        </Text>

        <Text style={styles.body}>
          Not a personality test. Just one useful signal about how connection starts for you.
        </Text>

        <View style={styles.options}>
          {options.map((option) => (
            <SelectionCard
              key={option.value}
              title={option.title}
              body={option.body}
              selected={
                chemistryStyle ===
                option.value
              }
              onPress={() =>
                setChemistryStyle(
                  option.value,
                )
              }
            />
          ))}
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

  options: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
