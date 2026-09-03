import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';

import {
  ProfilePhotoTile,
} from '../src/components/ProfilePhotoTile';

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
    mode,
  } = useLocalSearchParams<{
    mode?: string;
  }>();

  const isEditMode =
    mode === 'edit';

  const {
    heroPhotoReady,
    heroPhoto,
    photoMutationPosition,
    choosePhoto,
    deletePhoto,
  } = useProfile();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() => {
            if (heroPhotoReady) {
              if (isEditMode) {
                router.push({
                  pathname: '/photos',
                  params: {
                    mode: 'edit',
                  },
                } as never);
                return;
              }

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
          <ProfilePhotoTile
            uri={heroPhoto?.signedUrl}
            label="Add your main photo"
            hero
            busy={photoMutationPosition === 1}
            onPress={() => {
              void choosePhoto(1).catch((error) => {
                Alert.alert(
                  'Photo not saved',
                  error instanceof Error
                    ? error.message
                    : 'Please try again.',
                );
              });
            }}
            onRemove={
              heroPhoto
                ? () => {
                    void deletePhoto(1).catch((error) => {
                    Alert.alert(
                      'Photo not removed',
                      error instanceof Error
                        ? error.message
                        : 'Please try again.',
                    );
                  });
                  }
                : undefined
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
