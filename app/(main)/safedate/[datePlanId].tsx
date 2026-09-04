import { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useDiscovery } from "../../../src/features/discovery/DiscoveryContext";
import { useSafeDate } from "../../../src/features/safedate/SafeDateContext";
import { useSafeDateProtection } from "../../../src/features/safedate/useSafeDateProtection";
import {
  colors,
  radius,
  spacing,
} from "../../../src/theme/tokens";

function formatMoment(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SafeDateScreen() {
  const router = useRouter();

  const {
    datePlanId: rawDatePlanId,
  } = useLocalSearchParams<{
    datePlanId?: string | string[];
  }>();

  const datePlanId = Array.isArray(rawDatePlanId)
    ? rawDatePlanId[0]
    : rawDatePlanId;

  const {
    datePlans,
    getConnection,
  } = useDiscovery();

  const {
    getSessionForDatePlan,
    loadSessionForDatePlan,
    startSession,
    endMySide,
    isLoadingSession,
    isMutatingSession,
    safeDateError,
  } = useSafeDate();

  const plan =
    datePlans.find(
      (item) => item.id === datePlanId,
    ) ?? null;

  const connection = plan
    ? getConnection(plan.connectionId)
    : null;

  const session = datePlanId
    ? getSessionForDatePlan(datePlanId)
    : null;

  const isEnded =
    session?.status === "ended";

  const mySideEnded =
    Boolean(session?.mySideEnded);

  const protectionActive =
    Boolean(
      session &&
      !isEnded &&
      !mySideEnded,
    );

  const {
    protection,
    loading: protectionLoading,
    mutating: protectionMutating,
    error: protectionError,
    checkIn,
    setCheckInInterval,
    requestAssistance,
    clearAssistance,
    confirmSafeArrival,
  } = useSafeDateProtection(
    datePlanId,
    protectionActive,
  );

  useEffect(() => {
    if (datePlanId) {
      void loadSessionForDatePlan(
        datePlanId,
      );
    }
  }, [
    datePlanId,
    loadSessionForDatePlan,
  ]);

  if (!plan || !connection) {
    return (
      <View style={styles.screen}>
        <View style={styles.missingWrap}>
          <Text style={styles.eyebrow}>
            SAFEDATE™
          </Text>

          <Text style={styles.missingTitle}>
            Date plan unavailable.
          </Text>

          <Text style={styles.body}>
            SafeDate™ needs an existing
            production date plan.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const nextCheckInLabel =
    formatMoment(
      protection?.nextCheckInAt ??
        null,
    );

  const lastCheckInLabel =
    formatMoment(
      protection?.lastCheckInAt ??
        null,
    );

  const safeArrivalLabel =
    formatMoment(
      protection
        ?.safeArrivalConfirmedAt ??
        null,
    );

  const assistanceActive =
    Boolean(
      protection
        ?.assistanceRequestedAt,
    );

  const checkInMinutes =
    protection
      ?.checkInIntervalMinutes ??
    null;

  const protectionBusy =
    protectionLoading ||
    protectionMutating;

  async function handleStart() {
    if (!plan || isMutatingSession) {
      return;
    }

    const planId = plan.id;

    await startSession(planId);
  }

  async function handleEnd() {
    if (
      !plan ||
      !session ||
      mySideEnded ||
      isMutatingSession
    ) {
      return;
    }

    const planId = plan.id;

    await endMySide(planId);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <View style={styles.brand}>
            <Text style={styles.heart}>
              ♥
            </Text>

            <Text
              style={styles.brandText}
            >
              BTME™
            </Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>
          SAFEDATE™
        </Text>

        <Text style={styles.title}>
          Your side. Your safety.
        </Text>

        <Text style={styles.body}>
          Each person controls their
          own SafeDate™ independently.
          Neither person can switch
          off the other person's side.
        </Text>

        <View style={styles.dateCard}>
          <View
            style={styles.identityRow}
          >
            <View style={styles.avatar}>
              <Text
                style={
                  styles.avatarText
                }
              >
                {
                  connection.profile
                    .accent
                }
              </Text>
            </View>

            <View style={styles.identity}>
              <Text style={styles.name}>
                {
                  connection.profile
                    .firstName
                }
              </Text>

              <Text
                style={
                  styles.compatibility
                }
              >
                {
                  connection.profile
                    .compatibility
                }
                % compatibility
              </Text>
            </View>
          </View>

          <View
            style={styles.detailBlock}
          >
            <Text
              style={styles.detailLabel}
            >
              WHEN
            </Text>

            <Text
              style={styles.detailValue}
            >
              {plan.day}
            </Text>

            <Text
              style={
                styles.detailSecondary
              }
            >
              {plan.time}
            </Text>

            <View style={styles.divider} />

            <Text
              style={styles.detailLabel}
            >
              WHERE
            </Text>

            <Text
              style={styles.detailValue}
            >
              {plan.place}
            </Text>
          </View>

          <Text style={styles.disclosure}>
            PRODUCTION DATE PLAN
          </Text>
        </View>

        {!session ? (
          <View style={styles.actionCard}>
            <Text
              style={styles.cardEyebrow}
            >
              READY WHEN YOU ARE
            </Text>

            <Text
              style={styles.actionTitle}
            >
              Start SafeDate™
            </Text>

            <Text
              style={styles.actionBody}
            >
              Starting creates the
              shared two-person
              SafeDate™ session. Your
              protection controls stay
              private to your side.
            </Text>

            {safeDateError ? (
              <Text
                style={styles.errorText}
              >
                {safeDateError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start SafeDate"
              disabled={
                isMutatingSession ||
                isLoadingSession
              }
              onPress={() =>
                void handleStart()
              }
              style={({ pressed }) => [
                styles.primaryButton,
                (isMutatingSession ||
                  isLoadingSession) &&
                  styles.disabledButton,
                pressed &&
                  !isMutatingSession &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {isMutatingSession
                  ? "Starting…"
                  : "Start SafeDate™"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={styles.actionCard}
            >
              <View
                style={styles.statusRow}
              >
                <View
                  style={[
                    styles.statusDot,
                    isEnded &&
                      styles.statusDotEnded,
                  ]}
                />

                <Text
                  style={
                    styles.statusText
                  }
                >
                  {isEnded
                    ? "SAFEDATE™ CLOSED"
                    : mySideEnded
                      ? "YOUR SIDE ENDED · OTHER SIDE OPEN"
                      : "SAFE DATE ACTIVE"}
                </Text>
              </View>

              <Text
                style={styles.actionTitle}
              >
                {isEnded
                  ? "Both sides are closed."
                  : mySideEnded
                    ? "Your side is closed."
                    : "Safety's running quietly."}
              </Text>

              <Text
                style={styles.actionBody}
              >
                {isEnded
                  ? "Both people independently ended their side, so the shared SafeDate™ session is closed."
                  : mySideEnded
                    ? `${connection.profile.firstName} keeps independent control of their side. The shared session remains open until they end it.`
                    : "You enjoy the date. Your private protection controls are here whenever you need them."}
              </Text>
            </View>

            {protectionActive ? (
              <View
                style={
                  styles.protectionCard
                }
              >
                <Text
                  style={
                    styles.cardEyebrow
                  }
                >
                  MY PRIVATE PROTECTION
                </Text>

                <Text
                  style={
                    styles.protectionTitle
                  }
                >
                  You're in control.
                </Text>

                <Text
                  style={
                    styles.protectionBody
                  }
                >
                  These actions belong
                  to your SafeDate™
                  side. Your date
                  cannot operate them.
                </Text>

                {protectionLoading &&
                !protection ? (
                  <Text
                    style={
                      styles.mutedText
                    }
                  >
                    Loading protection…
                  </Text>
                ) : null}

                {protectionError ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {protectionError}
                  </Text>
                ) : null}

                <View
                  style={
                    styles.controlGrid
                  }
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="I'm OK"
                    disabled={
                      protectionBusy
                    }
                    onPress={() =>
                      void checkIn()
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.controlButton,
                      protectionBusy &&
                        styles.disabledButton,
                      pressed &&
                        !protectionBusy &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.controlIcon
                      }
                    >
                      ✓
                    </Text>

                    <Text
                      style={
                        styles.controlTitle
                      }
                    >
                      I'M OK
                    </Text>

                    <Text
                      style={
                        styles.controlBody
                      }
                    >
                      {lastCheckInLabel
                        ? `Checked in ${lastCheckInLabel}`
                        : "Check in now"}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Check on me"
                    disabled={
                      protectionBusy
                    }
                    onPress={() =>
                      void setCheckInInterval(
                        checkInMinutes ===
                          30
                          ? null
                          : 30,
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.controlButton,
                      protectionBusy &&
                        styles.disabledButton,
                      pressed &&
                        !protectionBusy &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.controlIcon
                      }
                    >
                      ◷
                    </Text>

                    <Text
                      style={
                        styles.controlTitle
                      }
                    >
                      CHECK ON ME
                    </Text>

                    <Text
                      style={
                        styles.controlBody
                      }
                    >
                      {checkInMinutes
                        ? nextCheckInLabel
                          ? `Next ${nextCheckInLabel}`
                          : `${checkInMinutes} min timer active`
                        : "Set 30 min timer"}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    assistanceActive
                      ? "Clear private assistance request"
                      : "Get me out"
                  }
                  disabled={
                    protectionBusy
                  }
                  onPress={() =>
                    assistanceActive
                      ? void clearAssistance()
                      : void requestAssistance()
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.assistanceButton,
                    assistanceActive &&
                      styles.assistanceActive,
                    protectionBusy &&
                      styles.disabledButton,
                    pressed &&
                      !protectionBusy &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.assistanceTitle
                    }
                  >
                    {assistanceActive
                      ? "GET ME OUT · ACTIVE"
                      : "GET ME OUT"}
                  </Text>

                  <Text
                    style={
                      styles.assistanceBody
                    }
                  >
                    {assistanceActive
                      ? "Your private assistance state is active. Tap when you want to clear it."
                      : "Privately mark that you want assistance leaving this date."}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="I'm home safe"
                  disabled={
                    protectionBusy ||
                    Boolean(
                      protection
                        ?.safeArrivalConfirmedAt,
                    )
                  }
                  onPress={() =>
                    void confirmSafeArrival()
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.homeButton,
                    protection
                      ?.safeArrivalConfirmedAt &&
                      styles.homeConfirmed,
                    (protectionBusy ||
                      Boolean(
                        protection
                          ?.safeArrivalConfirmedAt,
                      )) &&
                      styles.disabledButton,
                    pressed &&
                      !protectionBusy &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.homeTitle
                    }
                  >
                    {safeArrivalLabel
                      ? "HOME SAFE ✓"
                      : "I'M HOME SAFE"}
                  </Text>

                  <Text
                    style={
                      styles.homeBody
                    }
                  >
                    {safeArrivalLabel
                      ? `Confirmed ${safeArrivalLabel}`
                      : "Confirm that you arrived home safely."}
                  </Text>
                </Pressable>

                <View
                  style={
                    styles.privateNotice
                  }
                >
                  <Text
                    style={
                      styles.privateNoticeTitle
                    }
                  >
                    PRIVATE MEANS PRIVATE
                  </Text>

                  <Text
                    style={
                      styles.privateNoticeBody
                    }
                  >
                    Your check-ins,
                    assistance state and
                    safe-arrival
                    confirmation are
                    private protection
                    state. They are not
                    controls for the
                    other person.
                  </Text>
                </View>
              </View>
            ) : null}

            <View
              style={styles.safetyCard}
            >
              <Text
                style={
                  styles.safetyEyebrow
                }
              >
                SAFETY BOUNDARY
              </Text>

              <Text
                style={
                  styles.safetyTitle
                }
              >
                Protection without
                pretending.
              </Text>

              <Text
                style={
                  styles.safetyBody
                }
              >
                SafeDate™ currently
                provides server-backed
                independent session
                control, private
                check-ins, a private
                assistance state and
                safe-arrival
                confirmation. It does
                not currently provide
                GPS tracking,
                trusted-contact
                delivery, background
                monitoring or
                emergency-service
                integration.
              </Text>
            </View>

            {safeDateError ? (
              <Text
                style={styles.errorText}
              >
                {safeDateError}
              </Text>
            ) : null}

            {isEnded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reflect privately on your date with ${connection.profile.firstName}`}
                onPress={() =>
                  router.push(
                    `/feedback/${plan.id}` as never,
                  )
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Reflect on the date
                </Text>
              </Pressable>
            ) : !mySideEnded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="End my side of SafeDate"
                disabled={
                  isMutatingSession
                }
                onPress={() =>
                  void handleEnd()
                }
                style={({ pressed }) => [
                  styles.endButton,
                  isMutatingSession &&
                    styles.disabledButton,
                  pressed &&
                    !isMutatingSession &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.endButtonText
                  }
                >
                  {isMutatingSession
                    ? "Updating…"
                    : "End my side"}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}

        <Text
          style={
            styles.footerDisclosure
          }
        >
          SAFEDATE™ · SERVER-BACKED ·
          PRIVATE CHECK-INS ·
          INDEPENDENT END CONTROL · NO
          GPS · NO EMERGENCY-SERVICE
          INTEGRATION
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    marginTop: -3,
    color: colors.textPrimary,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "400",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  heart: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 21,
  },

  brandText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },

  title: {
    maxWidth: 330,
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: -1.1,
  },

  body: {
    maxWidth: 340,
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },

  dateCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surface,
  },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor:
      colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },

  identity: {
    flex: 1,
    marginLeft: spacing.md,
  },

  name: {
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
  },

  compatibility: {
    marginTop: 3,
    color: colors.accent,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },

  detailBlock: {
    marginTop: spacing.lg,
  },

  detailLabel: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  detailValue: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },

  detailSecondary: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor:
      colors.border,
  },

  disclosure: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  actionCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surface,
  },

  cardEyebrow: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  actionTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
  },

  actionBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor:
      colors.accent,
  },

  statusDotEnded: {
    opacity: 0.35,
  },

  statusText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },

  protectionCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surface,
  },

  protectionTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  protectionBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },

  controlGrid: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },

  controlButton: {
    minHeight: 92,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surfaceElevated,
    justifyContent: "center",
  },

  controlIcon: {
    color: colors.accent,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "900",
  },

  controlTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  controlBody: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  assistanceButton: {
    minHeight: 96,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surfaceElevated,
    justifyContent: "center",
  },

  assistanceActive: {
    borderWidth: 2,
  },

  assistanceTitle: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  assistanceBody: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  homeButton: {
    minHeight: 86,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surfaceElevated,
    justifyContent: "center",
  },

  homeConfirmed: {
    borderColor: colors.accent,
  },

  homeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  homeBody: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  privateNotice: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  privateNoticeTitle: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  privateNoticeBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  safetyCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor:
      colors.surface,
  },

  safetyEyebrow: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  safetyTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },

  safetyBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },

  mutedText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  errorText: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },

  primaryButton: {
    minHeight: 54,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor:
      colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  endButton: {
    minHeight: 50,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor:
      colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  endButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  secondaryButton: {
    minHeight: 52,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor:
      colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.45,
  },

  buttonPressed: {
    opacity: 0.72,
  },

  footerDisclosure: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  missingWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  missingTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
});
