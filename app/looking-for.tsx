import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  ChoicePill,
} from '../src/components/ChoicePill';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  MatchPreference,
  useProfile,
} from '../src/features/profile/ProfileContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const preferences: Array<{
  value: MatchPreference;
  label: string;
}> = [
  {
    value: 'women',
    label: 'Women',
  },
  {
    value: 'men',
    label: 'Men',
  },
  {
    value: 'everyone',
    label: 'Everyone',
  },
];

export default function LookingForScreen() {
  const router = useRouter();

  const {
    matchPreference,
    setMatchPreference,
    minimumAge,
    maximumAge,
    setMinimumAge,
    setMaximumAge,
  } = useProfile();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Save preferences ❤️‍🔥"
          disabled={!matchPreference}
          onPress={() => {
            if (matchPreference) {
              router.push('/lifestyle');
            }
          }}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          YOUR MATCHES
        </Text>

        <Text style={styles.title}>
          Who are you looking for?
        </Text>

        <Text style={styles.body}>
          These preferences help shape who BTME introduces you to.
        </Text>

        <View style={styles.preferenceRow}>
          {preferences.map(
            (preference) => (
              <ChoicePill
                key={preference.value}
                label={preference.label}
                selected={
                  matchPreference ===
                  preference.value
                }
                onPress={() =>
                  setMatchPreference(
                    preference.value,
                  )
                }
              />
            ),
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Age range
        </Text>

        <View style={styles.ageRow}>
          <View style={styles.ageBox}>
            <Text style={styles.ageLabel}>
              MIN
            </Text>

            <Text style={styles.ageValue}>
              {minimumAge}
            </Text>

            <View style={styles.ageControls}>
              <Text
                onPress={() =>
                  setMinimumAge(
                    Math.max(
                      18,
                      minimumAge - 1,
                    ),
                  )
                }
                style={styles.control}
              >
                −
              </Text>

              <Text
                onPress={() =>
                  setMinimumAge(
                    Math.min(
                      maximumAge,
                      minimumAge + 1,
                    ),
                  )
                }
                style={styles.control}
              >
                +
              </Text>
            </View>
          </View>

          <View style={styles.ageBox}>
            <Text style={styles.ageLabel}>
              MAX
            </Text>

            <Text style={styles.ageValue}>
              {maximumAge}
            </Text>

            <View style={styles.ageControls}>
              <Text
                onPress={() =>
                  setMaximumAge(
                    Math.max(
                      minimumAge,
                      maximumAge - 1,
                    ),
                  )
                }
                style={styles.control}
              >
                −
              </Text>

              <Text
                onPress={() =>
                  setMaximumAge(
                    Math.min(
                      99,
                      maximumAge + 1,
                    ),
                  )
                }
                style={styles.control}
              >
                +
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          Preferences can be changed later. Hard deal-breakers will be handled separately from softer preferences.
        </Text>
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

  preferenceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },

  sectionTitle: {
    marginTop: spacing.xl,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },

  ageRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },

  ageBox: {
    flex: 1,
    minHeight: 150,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },

  ageLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  ageValue: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
  },

  ageControls: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },

  control: {
    color: colors.accent,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
  },

  note: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
