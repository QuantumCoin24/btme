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

export default function PhotosScreen() {
  const router = useRouter();
  const {
    mode,
  } = useLocalSearchParams<{
    mode?: string;
  }>();

  const isEditMode =
    mode === 'edit';
  const {
    photos,
    photoMutationPosition,
    choosePhoto,
    deletePhoto,
  } = useProfile();

  const positions = [2, 3, 4, 5, 6];

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue →"
          onPress={() => {
            if (isEditMode) {
              router.replace(
                '/(main)/edit-profile' as never,
              );
              return;
            }

            router.push('/intent');
          }}
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
          {positions.map((position) => {
            const photo =
              photos.find(
                (candidate) =>
                  candidate.position === position,
              ) ?? null;

            return (
              <View
                key={position}
                style={styles.slot}
              >
                <ProfilePhotoTile
                  uri={photo?.signedUrl}
                  label={`Add photo ${position - 1}`}
                  busy={
                    photoMutationPosition === position
                  }
                  onPress={() => {
                    void choosePhoto(
                      position,
                    ).catch((error) => {
                      Alert.alert(
                        'Photo not saved',
                        error instanceof Error
                          ? error.message
                          : 'Please try again.',
                      );
                    });
                  }}
                  onRemove={
                    photo
                      ? () => {
                          void deletePhoto(
                            position,
                          );
                        }
                      : undefined
                  }
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
