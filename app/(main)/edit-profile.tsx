import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useRouter,
} from 'expo-router';

import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

export default function EditProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.brand}>
            BTME™
          </Text>
        </View>

        <Text style={styles.eyebrow}>
          PROFILE MANAGER
        </Text>

        <Text style={styles.title}>
          Keep it current.
        </Text>

        <Text style={styles.body}>
          Revisit the existing BTME profile journey
          without creating a second copy of your
          profile state.
        </Text>

        <EditCard
          eyebrow="BASICS"
          title="Name"
          body="Update the name used across your profile."
          action="Edit name"
          onPress={() =>
            router.push('/name' as never)
          }
        />

        <EditCard
          eyebrow="LOCATION"
          title="Discovery area"
          body="Review your location and discovery radius."
          action="Edit location"
          onPress={() =>
            router.push('/location' as never)
          }
        />

        <EditCard
          eyebrow="PHOTOS"
          title="Profile photos"
          body="Return to the existing hero-photo setup."
          action="Edit photos"
          onPress={() =>
            router.push('/hero-photo' as never)
          }
        />

        <EditCard
          eyebrow="INTENT"
          title="What you want"
          body="Review your relationship intention."
          action="Edit intention"
          onPress={() =>
            router.push('/intent' as never)
          }
        />

        <EditCard
          eyebrow="YOUR VIBE"
          title="Lifestyle & chemistry"
          body="Revisit the signals that shape compatibility."
          action="Edit lifestyle"
          onPress={() =>
            router.push('/lifestyle' as never)
          }
        />

        <EditCard
          eyebrow="PROMPTS"
          title="The good stuff"
          body="Update the answers that give your profile personality."
          action="Edit prompts"
          onPress={() =>
            router.push(
              '/perfect-sunday' as never,
            )
          }
        />

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryEyebrow}>
            CURRENT FOUNDATION
          </Text>

          <Text style={styles.boundaryTitle}>
            One profile state.
          </Text>

          <Text style={styles.boundaryBody}>
            These controls return to the existing
            local profile journey. Persistent
            editing, save confirmation and
            server-side synchronization come with
            the production profile backend.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function EditCard({
  eyebrow,
  title,
  body,
  action,
  onPress,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.cardTitle}>
        {title}
      </Text>

      <Text style={styles.cardBody}>
        {body}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={onPress}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 30,
  },
  brand: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
  },
  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  cardTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  cardBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    marginTop: spacing.md,
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  boundaryCard: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },
  boundaryEyebrow: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  boundaryTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  boundaryBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
