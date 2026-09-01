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
  useRelationship,
} from '../../../src/features/relationship/RelationshipContext';
import {
  useSuccess,
} from '../../../src/features/success/SuccessContext';
import {
  colors,
  radius,
  spacing,
} from '../../../src/theme/tokens';

export default function SuccessScreen() {
  const router = useRouter();

  const {
    connectionId,
  } = useLocalSearchParams<{
    connectionId: string;
  }>();

  const {
    getConnection,
  } = useDiscovery();

  const {
    getRelationshipMode,
  } = useRelationship();

  const {
    getSuccessMoment,
    declareLocalSuccess,
    endLocalSuccess,
  } = useSuccess();

  const connection =
    typeof connectionId === 'string'
      ? getConnection(connectionId)
      : null;

  if (!connection) {
    return (
      <View style={styles.screen}>
        <View style={styles.missingCard}>
          <Text style={styles.eyebrow}>
            BTME SUCCESS
          </Text>

          <Text style={styles.missingTitle}>
            Connection unavailable.
          </Text>

          <Text style={styles.body}>
            This preview needs an existing local
            connection.
          </Text>
        </View>
      </View>
    );
  }

  const firstName =
    connection.profile.firstName;

  const relationship =
    getRelationshipMode(connection.id);

  const relationshipActive =
    relationship?.status === 'exploring';

  const success =
    getSuccessMoment(connection.id);

  const declared =
    success?.status === 'declared';

  const ended =
    success?.status === 'ended';

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
          BTME SUCCESS
        </Text>

        <Text style={styles.title}>
          {declared
            ? 'Looks like you found better.'
            : 'This could be the point.'}
        </Text>

        <Text style={styles.body}>
          BTME is supposed to succeed when you no
          longer need a dating app.
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

        {!relationshipActive && !declared && (
          <View style={styles.boundaryCard}>
            <Text style={styles.boundaryEyebrow}>
              NOT READY YET
            </Text>

            <Text style={styles.boundaryTitle}>
              Relationship Mode comes first.
            </Text>

            <Text style={styles.boundaryBody}>
              Your local Relationship Mode must be
              active before this success moment can
              be marked.
            </Text>
          </View>
        )}

        {relationshipActive &&
          !success && (
            <View style={styles.actionCard}>
              <Text style={styles.actionEyebrow}>
                YOUR DECISION
              </Text>

              <Text style={styles.actionTitle}>
                Think you found better?
              </Text>

              <Text style={styles.actionBody}>
                This records your own private
                intention only. It does not say
                {` ${firstName} `}
                chose the same thing.
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark that I think I found better"
                onPress={() =>
                  declareLocalSuccess(
                    connection.id,
                  )
                }
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>
                  I think I found better ❤️‍🔥
                </Text>
              </Pressable>
            </View>
          )}

        {declared && (
          <View style={styles.successCard}>
            <Text style={styles.successHeart}>
              ♥
            </Text>

            <Text style={styles.successTitle}>
              Mission accomplished.
            </Text>

            <Text style={styles.successBody}>
              You marked this connection as the one
              you want to focus on.
            </Text>

            <Text style={styles.successBody}>
              BTME has not deleted your account,
              cancelled membership, hidden your
              profile or claimed that{' '}
              {firstName} made the same decision.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End my local success moment"
              onPress={() =>
                endLocalSuccess(
                  connection.id,
                )
              }
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                Undo my success moment
              </Text>
            </Pressable>
          </View>
        )}

        {ended && (
          <View style={styles.actionCard}>
            <Text style={styles.actionEyebrow}>
              YOUR SUCCESS MOMENT ENDED
            </Text>

            <Text style={styles.actionTitle}>
              No pressure.
            </Text>

            <Text style={styles.actionBody}>
              Only your local success state ended.
              Your connection and Relationship Mode
              are unchanged.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark that I think I found better again"
              onPress={() =>
                declareLocalSuccess(
                  connection.id,
                )
              }
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>
                I think I found better ❤️‍🔥
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryEyebrow}>
            PREVIEW BOUNDARY
          </Text>

          <Text style={styles.boundaryTitle}>
            Success is not mutual confirmation.
          </Text>

          <Text style={styles.boundaryBody}>
            This is local state only. No message is
            sent, no relationship is confirmed, no
            account is deleted and no subscription
            is changed.
          </Text>
        </View>

        <Text style={styles.footer}>
          SUCCESS PREVIEW · YOUR SIDE ONLY · LOCAL
          STATE · NO ACCOUNT CHANGE · NOT MUTUAL
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
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 16,
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
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.4,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 27,
    fontWeight: '900',
  },
  personCopy: {
    flex: 1,
  },
  personName: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
  },
  personMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },
  actionCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },
  actionEyebrow: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  actionTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  actionBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  successCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.xl,
    alignItems: 'center',
  },
  successHeart: {
    color: colors.accent,
    fontSize: 48,
    lineHeight: 54,
  },
  successTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  successBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
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
  primaryButton: {
    marginTop: spacing.lg,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  missingCard: {
    margin: spacing.lg,
    marginTop: spacing.xxxl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  missingTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  footer: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
});
