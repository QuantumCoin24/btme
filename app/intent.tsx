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
  RelationshipIntent,
  useProfile,
} from '../src/features/profile/ProfileContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const options: Array<{
  value: RelationshipIntent;
  title: string;
  body: string;
}> = [
  {
    value: 'relationship',
    title: 'A relationship',
    body: 'Something real and committed.',
  },
  {
    value: 'life-partner',
    title: 'A life partner',
    body: 'Long-term, serious and future-focused.',
  },
  {
    value: 'intentional-dating',
    title: 'Dating with intention',
    body: 'Open-minded, but not here to waste time.',
  },
  {
    value: 'open-genuine',
    title: 'Something genuine',
    body: 'Open to seeing where the right connection goes.',
  },
];

export default function IntentScreen() {
  const router = useRouter();

  const {
    relationshipIntent,
    setRelationshipIntent,
  } = useProfile();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() => {
            if (relationshipIntent) {
              router.push('/looking-for');
            }
          }}
          disabled={!relationshipIntent}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          WHAT DO YOU WANT?
        </Text>

        <Text style={styles.title}>
          What would actually make you happy?
        </Text>

        <Text style={styles.body}>
          We use this to introduce people whose intentions line up with yours.
        </Text>

        <View style={styles.options}>
          {options.map((option) => (
            <SelectionCard
              key={option.value}
              title={option.title}
              body={option.body}
              selected={
                relationshipIntent ===
                option.value
              }
              onPress={() =>
                setRelationshipIntent(
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
