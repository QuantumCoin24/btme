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

export default function HeroPhotoScreen() {
  const router = useRouter();

  const {
    heroPhotoReady,
    setHeroPhotoReady,
  } = useProfile();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() => {
            if (heroPhotoReady) {
              router.push('/photos');
            }
          }}
          disabled={!heroPhotoReady}
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          YOUR PROFILE
        </Text>

        <Text style={styles.title}>
          Show us you.
        </Text>

        <Text style={styles.body}>
          Pick the photo that should introduce you first.
        </Text>

        <View style={styles.photo}>
          <PhotoPlaceholder
            label={
              heroPhotoReady
                ? 'Hero photo selected'
                : 'Add your main photo'
            }
            selected={heroPhotoReady}
            onPress={() =>
              setHeroPhotoReady(true)
            }
          />
        </View>

        <Text style={styles.note}>
          Choose a clear photo where you look like you. You can change it later.
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
    ...typography.display,
  },

  body: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.body,
  },

  photo: {
    marginTop: spacing.xl,
  },

  note: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
