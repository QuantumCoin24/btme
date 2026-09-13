import {
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const { connections } = useDiscovery();

  const {
    getMemberSafetyState,
    refreshMemberSafetyState,
    blockMember,
    unblockMember,
    submitReport,
  } = useMemberSafety();

  const [
    reportingConnectionId,
    setReportingConnectionId,
  ] = useState<string | null>(null);

  const [report, setReport] =
    useState('');

  const [category, setCategory] =
    useState('other');

  useEffect(() => {
    for (const connection of connections) {
      void refreshMemberSafetyState(
        connection.id,
      ).catch(() => undefined);
    }
  }, [
    connections,
    refreshMemberSafetyState,
  ]);

  async function handleBlock(
    connectionId: string,
    firstName: string,
  ) {
    const state =
      getMemberSafetyState(connectionId);

    try {
      if (state.blockedByMe) {
        await unblockMember(connectionId);
        return;
      }

      await blockMember(connectionId);

      Alert.alert(
        `${firstName} blocked`,
        'BTME has applied the block on the server. Messaging between this connection is now unavailable while either member has an active block.',
      );
    } catch (error) {
      Alert.alert(
        'Safety control unavailable',
        error instanceof Error
          ? error.message
          : 'BTME could not update this block.',
      );
    }
  }

  async function handleSubmitReport(
    connectionId: string,
    firstName: string,
  ) {
    try {
      const reportId =
        await submitReport(
          connectionId,
          category,
          report,
        );

      setReport('');
      setCategory('other');
      setReportingConnectionId(null);

      Alert.alert(
        'Report submitted',
        `Your private BTME safety report about ${firstName} was submitted. Reference: ${reportId}`,
      );
    } catch (error) {
      Alert.alert(
        'Report not submitted',
        error instanceof Error
          ? error.message
          : 'BTME could not submit this report.',
      );
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
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
          SAFETY CENTRE
        </Text>

        <Text style={styles.title}>
          Your boundaries.
          {'\n'}
          Enforced.
        </Text>

        <Text style={styles.body}>
          Block a connection or submit a
          private safety report. Blocking
          is enforced by BTME on the server,
          not only on this device.
        </Text>

        {connections.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>
              No connections yet
            </Text>

            <Text style={styles.cardBody}>
              Safety controls will appear
              here when you have a
              connection.
            </Text>
          </View>
        )}

        {connections.map((connection) => {
          const state =
            getMemberSafetyState(
              connection.id,
            );

          const reporting =
            reportingConnectionId ===
            connection.id;

          return (
            <View
              key={connection.id}
              style={styles.memberCard}
            >
              <View style={styles.memberTop}>
                <View style={styles.avatar}>
                  <Text
                    style={styles.avatarText}
                  >
                    {connection.profile.firstName
                      .slice(0, 1)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.memberCopy}>
                  <Text
                    style={styles.memberName}
                  >
                    {
                      connection.profile
                        .firstName
                    }
                  </Text>

                  <Text
                    style={styles.memberMeta}
                  >
                    {state.loading
                      ? 'Checking server safety state…'
                      : 'Connected member'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text
                style={styles.controlLabel}
              >
                BLOCK
              </Text>

              <Text
                style={styles.controlBody}
              >
                {state.blockedByMe
                  ? 'You blocked this member. BTME server enforcement is active.'
                  : 'You have not blocked this member.'}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  state.blockedByMe
                    ? `Unblock ${connection.profile.firstName}`
                    : `Block ${connection.profile.firstName}`
                }
                disabled={
                  state.loading ||
                  state.mutating
                }
                onPress={() =>
                  void handleBlock(
                    connection.id,
                    connection.profile
                      .firstName,
                  )
                }
                style={[
                  styles.secondaryButton,
                  (state.loading ||
                    state.mutating) &&
                    styles.disabledButton,
                ]}
              >
                <Text
                  style={styles.secondaryText}
                >
                  {state.mutating
                    ? 'Updating…'
                    : state.blockedByMe
                      ? 'Unblock'
                      : 'Block member'}
                </Text>
              </Pressable>

              <View style={styles.divider} />

              <Text
                style={styles.controlLabel}
              >
                REPORT
              </Text>

              <Text
                style={styles.controlBody}
              >
                {state.reportCount > 0
                  ? `${state.reportCount} private report${state.reportCount === 1 ? '' : 's'} submitted by you.`
                  : 'No report has been submitted by you.'}
              </Text>

              {!reporting ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Report ${connection.profile.firstName}`}
                  disabled={
                    state.loading ||
                    state.mutating
                  }
                  onPress={() => {
                    setReport('');
                    setCategory('other');
                    setReportingConnectionId(
                      connection.id,
                    );
                  }}
                  style={
                    styles.secondaryButton
                  }
                >
                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    Submit a report
                  </Text>
                </Pressable>
              ) : (
                <>
                  <TextInput
                    accessibilityLabel="Report category"
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Category"
                    placeholderTextColor={
                      colors.textMuted
                    }
                    maxLength={80}
                    style={styles.categoryInput}
                  />

                  <TextInput
                    accessibilityLabel="Private safety report"
                    value={report}
                    onChangeText={setReport}
                    placeholder="Tell BTME what happened..."
                    placeholderTextColor={
                      colors.textMuted
                    }
                    multiline
                    maxLength={4000}
                    style={styles.input}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Submit private safety report"
                    disabled={
                      state.mutating ||
                      !report.trim()
                    }
                    onPress={() =>
                      void handleSubmitReport(
                        connection.id,
                        connection.profile
                          .firstName,
                      )
                    }
                    style={[
                      styles.primaryButton,
                      (state.mutating ||
                        !report.trim()) &&
                        styles.disabledButton,
                    ]}
                  >
                    <Text
                      style={
                        styles.primaryText
                      }
                    >
                      {state.mutating
                        ? 'Submitting…'
                        : 'Submit report'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel report"
                    disabled={
                      state.mutating
                    }
                    onPress={() => {
                      setReport('');
                      setCategory('other');
                      setReportingConnectionId(
                        null,
                      );
                    }}
                    style={
                      styles.secondaryButton
                    }
                  >
                    <Text
                      style={
                        styles.secondaryText
                      }
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </>
              )}

              {state.latestReportId ? (
                <Text
                  style={
                    styles.reportReference
                  }
                >
                  Latest report ·{' '}
                  {state.latestReportId}
                </Text>
              ) : null}

              {state.error ? (
                <Text style={styles.errorText}>
                  {state.error}
                </Text>
              ) : null}
            </View>
          );
        })}

        <View style={styles.boundaryCard}>
          <Text
            style={styles.boundaryEyebrow}
          >
            PRODUCTION SAFETY
          </Text>

          <Text
            style={styles.boundaryTitle}
          >
            Server-backed enforcement.
          </Text>

          <Text
            style={styles.boundaryBody}
          >
            Blocks are enforced by BTME
            server authority and prevent
            messaging while either member
            has an active block. Reports
            are submitted privately to
            BTME's server records. Reporting
            does not contact police or
            emergency services and does not
            automatically block the member.
          </Text>
        </View>

        <Text style={styles.footer}>
          BTME™ SAFETY · SERVER AUTHORITY ·
          PRIVATE REPORTING · BLOCK
          ENFORCEMENT
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
  categoryInput: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  input: {
    marginTop: spacing.md,
    minHeight: 140,
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
  disabledButton: {
    opacity: 0.45,
  },
  reportReference: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.warning,
    fontSize: 13,
    lineHeight: 19,
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
