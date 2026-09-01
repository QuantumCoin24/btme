import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useState,
} from 'react';
import {
  useRouter,
} from 'expo-router';

import {
  useDiscovery,
} from '../../src/features/discovery/DiscoveryContext';
import {
  useMemberSafety,
} from '../../src/features/safety/MemberSafetyContext';
import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

export default function SafetyCenterScreen() {
  const router = useRouter();

  const {
    connections,
  } = useDiscovery();

  const {
    getMemberSafetyState,
    toggleLocalBlock,
    saveLocalReportDraft,
  } = useMemberSafety();

  const [
    draftingConnectionId,
    setDraftingConnectionId,
  ] = useState<string | null>(null);

  const [
    draft,
    setDraft,
  ] = useState('');

  function beginDraft(
    connectionId: string,
  ) {
    const existing =
      getMemberSafetyState(
        connectionId,
      );

    setDraft(existing.reportDraft);
    setDraftingConnectionId(connectionId);
  }

  function saveDraft(
    connectionId: string,
  ) {
    saveLocalReportDraft(
      connectionId,
      draft,
    );

    setDraftingConnectionId(null);
  }

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
          SAFETY CENTER
        </Text>

        <Text style={styles.title}>
          Your boundaries matter.
        </Text>

        <Text style={styles.body}>
          Blocking and reporting need real
          server-side enforcement in production.
          This foundation lets us design the member
          experience without pretending those
          systems are active.
        </Text>

        {connections.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>
              No connections yet.
            </Text>

            <Text style={styles.cardBody}>
              Member safety controls will appear
              here when you have a connection.
            </Text>
          </View>
        )}

        {connections.map((connection) => {
          const state =
            getMemberSafetyState(
              connection.id,
            );

          const drafting =
            draftingConnectionId ===
            connection.id;

          return (
            <View
              key={connection.id}
              style={styles.memberCard}
            >
              <View style={styles.memberTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {connection.profile.firstName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberCopy}>
                  <Text style={styles.memberName}>
                    {connection.profile.firstName}
                  </Text>

                  <Text style={styles.memberMeta}>
                    {connection.profile.city} ·{' '}
                    {connection.profile.compatibility}%
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.controlLabel}>
                BLOCK
              </Text>

              <Text style={styles.controlBody}>
                {state.locallyBlocked
                  ? 'Marked blocked in this local preview only.'
                  : 'No production block is active.'}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  state.locallyBlocked
                    ? `Remove local preview block for ${connection.profile.firstName}`
                    : `Mark ${connection.profile.firstName} blocked in local preview`
                }
                onPress={() =>
                  toggleLocalBlock(
                    connection.id,
                  )
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>
                  {state.locallyBlocked
                    ? 'Undo local block'
                    : 'Block in preview'}
                </Text>
              </Pressable>

              <View style={styles.divider} />

              <Text style={styles.controlLabel}>
                REPORT
              </Text>

              <Text style={styles.controlBody}>
                {state.reportDraft
                  ? 'A private local report draft is saved.'
                  : 'No report has been submitted.'}
              </Text>

              {!drafting && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Draft a report about ${connection.profile.firstName}`}
                  onPress={() =>
                    beginDraft(
                      connection.id,
                    )
                  }
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>
                    {state.reportDraft
                      ? 'Edit report draft'
                      : 'Draft a report'}
                  </Text>
                </Pressable>
              )}

              {drafting && (
                <>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Write a private report draft..."
                    placeholderTextColor={
                      colors.textMuted
                    }
                    multiline
                    maxLength={750}
                    style={styles.input}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save report draft locally"
                    onPress={() =>
                      saveDraft(
                        connection.id,
                      )
                    }
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryText}>
                      Save draft locally
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryEyebrow}>
            PRODUCTION BOUNDARY
          </Text>

          <Text style={styles.boundaryTitle}>
            No enforcement is running.
          </Text>

          <Text style={styles.boundaryBody}>
            Preview blocks do not prevent contact
            or remove profiles. Report drafts are
            not submitted to moderators, servers,
            police or emergency services.
          </Text>
        </View>

        <Text style={styles.footer}>
          SAFETY FOUNDATION · LOCAL STATE ONLY · NO
          REPORT SUBMITTED · NO SERVER BLOCK
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 21,
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
  emptyCard: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  memberCard: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 25,
    fontWeight: '900',
  },
  memberCopy: {
    flex: 1,
  },
  memberName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  memberMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  controlLabel: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  controlBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  cardTitle: {
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
  input: {
    marginTop: spacing.md,
    minHeight: 130,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: spacing.md,
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  boundaryCard: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
  footer: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
