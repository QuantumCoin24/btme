import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  useDiscovery,
} from '../../../src/features/discovery/DiscoveryContext';
import {
  useFeedback,
} from '../../../src/features/feedback/FeedbackContext';
import {
  useRelationship,
} from '../../../src/features/relationship/RelationshipContext';
import {
  colors,
  radius,
  spacing,
} from '../../../src/theme/tokens';

export default function RelationshipModeScreen() {
  const router = useRouter();

  const {
    connectionId,
  } = useLocalSearchParams<{
    connectionId: string;
  }>();

  const {
    datePlans,
    getConnection,
  } = useDiscovery();

  const {
    getReflectionForDatePlan,
  } = useFeedback();

  const {
    getRelationshipMode,
    startLocalRelationshipMode,
    endLocalRelationshipMode,
  } = useRelationship();

  const connection =
    typeof connectionId === 'string'
      ? getConnection(connectionId)
      : null;

  const relevantPlans = connection
    ? datePlans.filter(
        (plan) =>
          plan.connectionId === connection.id,
      )
    : [];

  const positiveReflection =
    relevantPlans.some((plan) => {
      const reflection =
        getReflectionForDatePlan(plan.id);

      return (
        reflection?.seeAgain === 'yes'
      );
    });

  const mode = connection
    ? getRelationshipMode(connection.id)
    : null;

  const isExploring =
    mode?.status === 'exploring';

  const hasEnded =
    mode?.status === 'ended';

  if (!connection) {
    return (
      <View style={styles.screen}>
        <View style={styles.missingCard}>
          <Text style={styles.eyebrow}>
            RELATIONSHIP MODE
          </Text>

          <Text style={styles.missingTitle}>
            Connection unavailable.
          </Text>

          <Text style={styles.body}>
            Relationship Mode needs an existing
            local connection.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const firstName =
    connection.profile.firstName;

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
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
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
          RELATIONSHIP MODE
        </Text>

        <Text style={styles.title}>
          Maybe you found better.
        </Text>

        <Text style={styles.body}>
          When one connection starts feeling
          different, you can mark that intention
          privately on your side.
        </Text>

        <View style={styles.personCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.personCopy}>
            <Text style={styles.personName}>
              {firstName}
            </Text>

            <Text style={styles.personMeta}>
              {connection.profile.city} ·{' '}
              {connection.profile.compatibility}%
              {' '}compatibility
            </Text>
          </View>
        </View>

        <View style={styles.signalCard}>
          <Text style={styles.signalEyebrow}>
            YOUR SIGNAL
          </Text>

          <Text style={styles.signalTitle}>
            {positiveReflection
              ? 'You said you would see them again.'
              : 'This is your decision.'}
          </Text>

          <Text style={styles.signalBody}>
            {positiveReflection
              ? 'Relationship Mode can build on that private reflection without making any claim about what they want.'
              : 'Only you can choose whether this connection feels worth exploring more seriously.'}
          </Text>
        </View>

        {!mode && (
          <View style={styles.modeCard}>
            <Text style={styles.modeEyebrow}>
              YOUR SIDE ONLY
            </Text>

            <Text style={styles.modeTitle}>
              See where this goes.
            </Text>

            <Text style={styles.modeBody}>
              Starting Relationship Mode records
              your intention locally. It does not
              tell {firstName}, make you exclusive,
              pause discovery, change membership,
              or mean {firstName} chose the same
              thing.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start Relationship Mode for your connection with ${firstName}`}
              onPress={() =>
                startLocalRelationshipMode(
                  connection.id,
                )
              }
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                See where this goes ❤️‍🔥
              </Text>
            </Pressable>
          </View>
        )}

        {isExploring && (
          <View style={styles.activeCard}>
            <View style={styles.statusRow}>
              <View style={styles.activeDot} />

              <Text style={styles.activeStatus}>
                YOUR RELATIONSHIP MODE
              </Text>
            </View>

            <Text style={styles.activeTitle}>
              You’re seeing where this goes.
            </Text>

            <Text style={styles.activeBody}>
              This represents your intention only.
              Nothing about {firstName} is inferred,
              and discovery or membership has not
              been changed.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End my Relationship Mode"
              onPress={() =>
                endLocalRelationshipMode(
                  connection.id,
                )
              }
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                End my Relationship Mode
              </Text>
            </Pressable>
          </View>
        )}

        {hasEnded && (
          <View style={styles.endedCard}>
            <Text style={styles.endedEyebrow}>
              YOUR MODE ENDED
            </Text>

            <Text style={styles.endedTitle}>
              Back to your own pace.
            </Text>

            <Text style={styles.endedBody}>
              Only your local Relationship Mode
              ended. Nothing about {firstName} or
              the connection is inferred.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start my Relationship Mode again"
              onPress={() =>
                startLocalRelationshipMode(
                  connection.id,
                )
              }
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                See where this goes again
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryEyebrow}>
            PREVIEW BOUNDARY
          </Text>

          <Text style={styles.boundaryTitle}>
            No relationship claim is being made.
          </Text>

          <Text style={styles.boundaryBody}>
            This preview is local state only. It
            does not notify {firstName}, create a
            mutual relationship, establish
            exclusivity, suspend discovery, cancel
            membership, or publish relationship
            status.
          </Text>
        </View>

        <Text style={styles.footerDisclosure}>
          RELATIONSHIP MODE · YOUR SIDE ONLY · LOCAL
          STATE · NOT MUTUAL · DISCOVERY UNCHANGED
        </Text>
      </ScrollView>
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
    lineHeight: 32,
    fontWeight: '400',
  },

  brand: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 2.2,
  },

  title: {
    marginTop: spacing.sm,
    maxWidth: 330,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
    letterSpacing: -1.3,
  },

  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },

  personCard: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },

  avatarText: {
    color: colors.accent,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },

  personCopy: {
    flex: 1,
  },

  personName: {
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },

  personMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  signalCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  signalEyebrow: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.7,
  },

  signalTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },

  signalBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },

  modeCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  modeEyebrow: {
    color: colors.warning,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.7,
  },

  modeTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },

  modeBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },

  primaryButton: {
    marginTop: spacing.lg,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  secondaryButton: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.72,
  },

  activeCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  activeStatus: {
    color: colors.success,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  activeTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },

  activeBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },

  endedCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  endedEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  endedTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
  },

  endedBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },

  boundaryCard: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  boundaryEyebrow: {
    color: colors.warning,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  boundaryTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },

  boundaryBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },

  footerDisclosure: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.15,
    textAlign: 'center',
  },

  missingCard: {
    margin: spacing.lg,
    marginTop: spacing.xxxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  missingTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
});
