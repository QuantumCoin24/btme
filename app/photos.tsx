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
  PhotoPlaceholder,
} from '../src/components/PhotoPlaceholder';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  useProfile,
} from '../src/features/profile/ProfileContext';

import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

export default function PhotosScreen() {
  const router = useRouter();

  const {
    additionalPhotoCount,
    setAdditionalPhotoCount,
  } = useProfile();

  const slots = [1, 2, 3, 4, 5];

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() =>
            router.push('/intent')
          }
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          MORE OF YOU
        </Text>

        <Text style={styles.title}>
          Give them something to discover.
        </Text>

        <Text style={styles.body}>
          Add a few more photos. We’ll keep the profile clean and visual.
        </Text>

        <View style={styles.grid}>
          {slots.map((slot) => {
            const selected =
              additionalPhotoCount >= slot;

            return (
              <View
                key={slot}
                style={styles.slot}
              >
                <PhotoPlaceholder
                  label={
                    selected
                      ? `Photo ${slot}`
                      : 'Add photo'
                  }
                  selected={selected}
                  onPress={() => {
                    if (selected) {
                      setAdditionalPhotoCount(
                        slot - 1,
                      );
                    } else {
                      setAdditionalPhotoCount(
                        slot,
                      );
                    }
                  }}
                />
              </View>
            );
          })}
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

  grid: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  slot: {
    width: '47%',
  },
});
