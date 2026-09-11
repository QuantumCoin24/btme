import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Share,
} from "react-native";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useDiscovery } from "../../../src/features/discovery/DiscoveryContext";
import { useSafeDate } from "../../../src/features/safedate/SafeDateContext";
import { useSafeDateProtection } from "../../../src/features/safedate/useSafeDateProtection";
import {
  loadMySafeDateGuardianResponse,
  requestMySafeDateGuardianAssistance,
  resolveMySafeDateGuardianResponse,
  safeDateGuardianErrorMessage,
} from "../../../src/features/safedate/safeDateGuardian";
import {
  disableMySafeDateLocationProtection,
  enableMySafeDateLocationProtection,
} from "../../../src/features/safedate/safeDateLocationAuthority";
import {
  addMySafeDateTrustedContact,
  createMySafeDateTrustedContactInvite,
  getMyActiveSafeDateTrustedContacts,
  getMySafeDateTrustedContacts,
  revokeMySafeDateTrustedContact,
  setMySafeDateTrustedContactEnabled,
  type SafeDateTrustedContact,
} from "../../../src/features/safedate/safeDateTrustedContacts";
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
  const [locationMutating, setLocationMutating] =
    useState(false);
  const [locationError, setLocationError] =
    useState<string | null>(null);
  const [trustedContacts, setTrustedContacts] =
    useState<SafeDateTrustedContact[]>([]);
  const [activeTrustedContactIds, setActiveTrustedContactIds] =
    useState<Set<string>>(new Set());
  const [trustedContactName, setTrustedContactName] =
    useState("");
  const [trustedContactPhone, setTrustedContactPhone] =
    useState("");
  const [trustedContactEmail, setTrustedContactEmail] =
    useState("");
  const [trustedContactMutating, setTrustedContactMutating] =
    useState(false);
  const [trustedContactError, setTrustedContactError] =
    useState<string | null>(null);
  const [guardianMutating, setGuardianMutating] =
    useState(false);
  const [guardianEscalationId, setGuardianEscalationId] =
    useState<string | null>(null);
  const [guardianError, setGuardianError] =
    useState<string | null>(null);

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
    refresh: refreshProtection,
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

  const locationEnabled =
    Boolean(
      protection?.locationSharingEnabled &&
      protection.locationSharingExpiresAt &&
      new Date(
        protection.locationSharingExpiresAt,
      ).getTime() > Date.now(),
    );

  const protectionBusy =
    protectionLoading ||
    protectionMutating ||
    locationMutating ||
    guardianMutating;

  useEffect(() => {
    let cancelled = false;

    async function hydrateGuardianResponse() {
      if (
        !datePlanId ||
        !protectionActive
      ) {
        if (!cancelled) {
          setGuardianEscalationId(null);
          setGuardianError(null);
        }

        return;
      }

      try {
        const response =
          await loadMySafeDateGuardianResponse(
            datePlanId,
          );

        if (!cancelled) {
          setGuardianEscalationId(
            response?.escalationId ?? null,
          );
          setGuardianError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setGuardianError(
            safeDateGuardianErrorMessage(
              caught,
            ),
          );
        }
      }
    }

    void hydrateGuardianResponse();

    return () => {
      cancelled = true;
    };
  }, [
    datePlanId,
    protectionActive,
  ]);

  async function handleGuardianAssistance() {
    if (
      !datePlanId ||
      !protectionActive ||
      guardianMutating
    ) {
      return;
    }

    setGuardianMutating(true);
    setGuardianError(null);

    try {
      const escalationId =
        await requestMySafeDateGuardianAssistance(
          datePlanId,
        );

      setGuardianEscalationId(escalationId);
    } catch (caught) {
      setGuardianError(
        safeDateGuardianErrorMessage(caught),
      );
    } finally {
      setGuardianMutating(false);
    }
  }

  async function handleResolveGuardian() {
    if (
      !datePlanId ||
      !guardianEscalationId ||
      guardianMutating
    ) {
      return;
    }

    setGuardianMutating(true);
    setGuardianError(null);

    try {
      await resolveMySafeDateGuardianResponse(
        datePlanId,
      );

      setGuardianEscalationId(null);
    } catch (caught) {
      setGuardianError(
        safeDateGuardianErrorMessage(caught),
      );
    } finally {
      setGuardianMutating(false);
    }
  }

  async function handleLocationProtection() {
    if (!datePlanId || locationMutating) {
      return;
    }

    setLocationMutating(true);
    setLocationError(null);

    try {
      if (locationEnabled) {
        await disableMySafeDateLocationProtection(
          datePlanId,
        );
      } else {
        const result =
          await enableMySafeDateLocationProtection(
            datePlanId,
          );

        if (!result.enabled) {
          setLocationError(
            result.canAskAgain
              ? "Location permission is required to enable SafeDate location protection."
              : "Location permission is disabled. Enable location access for Better Than My Ex in iPhone Settings to use this protection.",
          );
          return;
        }
      }

      await refreshProtection();
    } catch (caught) {
      setLocationError(
        caught instanceof Error
          ? caught.message
          : "BTME could not update your location protection.",
      );
    } finally {
      setLocationMutating(false);
    }
  }

  async function refreshTrustedContacts() {
    if (!datePlanId || !protectionActive) {
      setTrustedContacts([]);
      setActiveTrustedContactIds(new Set());
      return;
    }

    try {
      const [contacts, activeContacts] = await Promise.all([
        getMySafeDateTrustedContacts(),
        getMyActiveSafeDateTrustedContacts(datePlanId),
      ]);

      setTrustedContacts(contacts);
      setActiveTrustedContactIds(
        new Set(activeContacts.map((contact) => contact.id)),
      );
      setTrustedContactError(null);
    } catch (caught) {
      setTrustedContactError(
        caught instanceof Error
          ? caught.message
          : "BTME could not load your trusted contacts.",
      );
    }
  }

  async function handleAddTrustedContact() {
    if (
      !datePlanId ||
      trustedContactMutating ||
      !trustedContactName.trim() ||
      (!trustedContactPhone.trim() &&
        !trustedContactEmail.trim())
    ) {
      if (
        !trustedContactName.trim() ||
        (!trustedContactPhone.trim() &&
          !trustedContactEmail.trim())
      ) {
        setTrustedContactError(
          "Add a name and at least a phone number or email address.",
        );
      }
      return;
    }

    setTrustedContactMutating(true);
    setTrustedContactError(null);

    try {
      const contactId =
        await addMySafeDateTrustedContact({
          name: trustedContactName.trim(),
          phone: trustedContactPhone.trim() || null,
          email: trustedContactEmail.trim() || null,
        });

      const token =
        await createMySafeDateTrustedContactInvite(
          contactId,
        );

      await Share.share({
        title: "BTME™ SafeDate™ trusted contact",
        message:
          "Join me as a BTME™ SafeDate™ trusted contact. " +
          "Open Better Than My Ex™ and accept this invite:\n\n" +
          `betterthanmyex://trusted-contact-invite?token=${token}`,
      });

      setTrustedContactName("");
      setTrustedContactPhone("");
      setTrustedContactEmail("");

      await Promise.all([
        refreshTrustedContacts(),
        refreshProtection(),
      ]);
    } catch (caught) {
      setTrustedContactError(
        caught instanceof Error
          ? caught.message
          : "BTME could not add your trusted contact.",
      );
    } finally {
      setTrustedContactMutating(false);
    }
  }

  async function handleInviteTrustedContact(
    trustedContactId: string,
  ) {
    if (trustedContactMutating) {
      return;
    }

    setTrustedContactMutating(true);
    setTrustedContactError(null);

    try {
      const token =
        await createMySafeDateTrustedContactInvite(
          trustedContactId,
        );

      await Share.share({
        title: "BTME™ SafeDate™ trusted contact",
        message:
          "Join me as a BTME™ SafeDate™ trusted contact. " +
          "Open Better Than My Ex™ and accept this invite:\n\n" +
          `betterthanmyex://trusted-contact-invite?token=${token}`,
      });

      await refreshTrustedContacts();
    } catch (caught) {
      setTrustedContactError(
        caught instanceof Error
          ? caught.message
          : "BTME could not create the trusted-contact invite.",
      );
    } finally {
      setTrustedContactMutating(false);
    }
  }

  async function handleToggleTrustedContact(
    trustedContactId: string,
  ) {
    if (!datePlanId || trustedContactMutating) {
      return;
    }

    const currentlyEnabled =
      activeTrustedContactIds.has(trustedContactId);

    setTrustedContactMutating(true);
    setTrustedContactError(null);

    try {
      await setMySafeDateTrustedContactEnabled(
        datePlanId,
        trustedContactId,
        !currentlyEnabled,
      );

      await Promise.all([
        refreshTrustedContacts(),
        refreshProtection(),
      ]);
    } catch (caught) {
      setTrustedContactError(
        caught instanceof Error
          ? caught.message
          : "BTME could not update trusted-contact protection.",
      );
    } finally {
      setTrustedContactMutating(false);
    }
  }

  async function handleRemoveTrustedContact(
    trustedContactId: string,
  ) {
    if (trustedContactMutating) {
      return;
    }

    setTrustedContactMutating(true);
    setTrustedContactError(null);

    try {
      await revokeMySafeDateTrustedContact(
        trustedContactId,
      );

      await Promise.all([
        refreshTrustedContacts(),
        refreshProtection(),
      ]);
    } catch (caught) {
      setTrustedContactError(
        caught instanceof Error
          ? caught.message
          : "BTME could not remove your trusted contact.",
      );
    } finally {
      setTrustedContactMutating(false);
    }
  }

  useEffect(() => {
    if (protectionActive && datePlanId) {
      void refreshTrustedContacts();
    } else {
      setTrustedContacts([]);
      setActiveTrustedContactIds(new Set());
    }
  }, [datePlanId, protectionActive]);

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

                <View style={styles.trustedContactSection}>
                  <Text style={styles.controlTitle}>
                    TRUSTED CONTACTS
                  </Text>
                  <Text style={styles.controlBody}>
                    Choose people you trust for your side of this SafeDate™.
                    Your date cannot view or control this list.
                  </Text>

                  {trustedContacts.map((contact) => {
                    const enabled =
                      activeTrustedContactIds.has(contact.id);
                    const linked = contact.linked;

                    return (
                      <View
                        key={contact.id}
                        style={styles.trustedContactRow}
                      >
                        <View style={styles.trustedContactIdentity}>
                          <Text style={styles.trustedContactName}>
                            {contact.name}
                          </Text>
                          <Text style={styles.controlBody}>
                            {contact.phone ??
                              contact.email ??
                              "Private trusted contact"}
                          </Text>
                          <Text style={styles.controlBody}>
                            {linked
                              ? "BTME™ linked"
                              : "Invite required"}
                          </Text>
                        </View>

                        {!linked ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Invite ${contact.name} to BTME SafeDate`}
                            disabled={trustedContactMutating}
                            onPress={() =>
                              void handleInviteTrustedContact(
                                contact.id,
                              )
                            }
                            style={({ pressed }) => [
                              styles.trustedContactToggle,
                              pressed &&
                                !trustedContactMutating &&
                                styles.buttonPressed,
                            ]}
                          >
                            <Text style={styles.trustedContactToggleText}>
                              INVITE
                            </Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            enabled
                              ? `Disable ${contact.name} for this SafeDate`
                              : `Enable ${contact.name} for this SafeDate`
                          }
                          disabled={
                            trustedContactMutating ||
                            !linked
                          }
                          onPress={() =>
                            void handleToggleTrustedContact(
                              contact.id,
                            )
                          }
                          style={({ pressed }) => [
                            styles.trustedContactToggle,
                            enabled &&
                              styles.trustedContactToggleActive,
                            (trustedContactMutating || !linked) &&
                              styles.disabledButton,
                            pressed &&
                              !trustedContactMutating &&
                              linked &&
                              styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.trustedContactToggleText}>
                            {!linked
                              ? "LINK FIRST"
                              : enabled
                                ? "ACTIVE"
                                : "OFF"}
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${contact.name}`}
                          disabled={trustedContactMutating}
                          onPress={() =>
                            void handleRemoveTrustedContact(
                              contact.id,
                            )
                          }
                          style={({ pressed }) => [
                            styles.trustedContactRemove,
                            pressed &&
                              styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.trustedContactRemoveText}>
                            REMOVE
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}

                  <TextInput
                    accessibilityLabel="Trusted contact name"
                    placeholder="Name"
                    placeholderTextColor={colors.textSecondary}
                    value={trustedContactName}
                    onChangeText={setTrustedContactName}
                    autoCapitalize="words"
                    style={styles.trustedContactInput}
                  />

                  <TextInput
                    accessibilityLabel="Trusted contact phone"
                    placeholder="Phone number"
                    placeholderTextColor={colors.textSecondary}
                    value={trustedContactPhone}
                    onChangeText={setTrustedContactPhone}
                    keyboardType="phone-pad"
                    style={styles.trustedContactInput}
                  />

                  <TextInput
                    accessibilityLabel="Trusted contact email"
                    placeholder="Email address"
                    placeholderTextColor={colors.textSecondary}
                    value={trustedContactEmail}
                    onChangeText={setTrustedContactEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.trustedContactInput}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add trusted contact"
                    disabled={trustedContactMutating}
                    onPress={() =>
                      void handleAddTrustedContact()
                    }
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      trustedContactMutating &&
                        styles.disabledButton,
                      pressed &&
                        !trustedContactMutating &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {trustedContactMutating
                        ? "Updating…"
                        : "Add trusted contact"}
                    </Text>
                  </Pressable>

                  {trustedContactError ? (
                    <Text style={styles.errorText}>
                      {trustedContactError}
                    </Text>
                  ) : null}

                  <Text style={styles.mutedText}>
                    Trusted contacts linked to BTME™ can receive
                    SafeDate™ push alerts on registered devices.
                    Precise location is not included in those alerts.
                    BTME™ does not claim that an alert was seen.
                  </Text>
                </View>

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

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      locationEnabled
                        ? "Disable location protection"
                        : "Enable location protection"
                    }
                    accessibilityState={{
                      disabled: protectionBusy,
                      selected: locationEnabled,
                    }}
                    disabled={
                      protectionBusy
                    }
                    onPress={() =>
                      void handleLocationProtection()
                    }
                    style={({ pressed }) => [
                      styles.controlButton,
                      locationEnabled &&
                        styles.locationActive,
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
                      ◎
                    </Text>

                    <Text
                      style={
                        styles.controlTitle
                      }
                    >
                      LOCATION PROTECTION
                    </Text>

                    <Text
                      style={
                        styles.controlBody
                      }
                    >
                      {locationMutating
                        ? "Updating protection…"
                        : locationEnabled
                          ? "Active · tap to turn off"
                          : "Off · tap to enable"}
                    </Text>
                  </Pressable>
                </View>

                {locationError ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {locationError}
                  </Text>
                ) : null}

                <View
                  style={styles.guardianSection}
                >
                  <Text
                    style={styles.guardianEyebrow}
                  >
                    SAFEDATE™ GUARDIAN
                  </Text>

                  <Text
                    style={styles.guardianTitle}
                  >
                    Private escalation.
                  </Text>

                  <Text
                    style={styles.guardianBody}
                  >
                    Guardian is a separate
                    escalation pathway for your
                    side of SafeDate™. It does not
                    notify your date, enable
                    location sharing, or claim to
                    contact emergency services.
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      guardianEscalationId
                        ? "Resolve SafeDate Guardian escalation"
                        : "Request SafeDate Guardian assistance"
                    }
                    accessibilityState={{
                      disabled: protectionBusy,
                      selected:
                        Boolean(
                          guardianEscalationId,
                        ),
                    }}
                    disabled={protectionBusy}
                    onPress={() =>
                      guardianEscalationId
                        ? void handleResolveGuardian()
                        : void handleGuardianAssistance()
                    }
                    style={({ pressed }) => [
                      styles.guardianButton,
                      guardianEscalationId &&
                        styles.guardianButtonActive,
                      protectionBusy &&
                        styles.disabledButton,
                      pressed &&
                        !protectionBusy &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={styles.guardianButtonTitle}
                    >
                      {guardianMutating
                        ? "UPDATING…"
                        : guardianEscalationId
                          ? "GUARDIAN ACTIVE"
                          : "CALL GUARDIAN"}
                    </Text>

                    <Text
                      style={styles.guardianButtonBody}
                    >
                      {guardianEscalationId
                        ? "Your private Guardian escalation is active. Tap when the situation is resolved."
                        : "Escalate privately through the SafeDate™ Guardian response protocol."}
                    </Text>
                  </Pressable>

                  {guardianEscalationId ? (
                    <Text
                      style={styles.guardianReference}
                    >
                      Guardian reference ·{" "}
                      {guardianEscalationId}
                    </Text>
                  ) : null}

                  {guardianError ? (
                    <Text style={styles.errorText}>
                      {guardianError}
                    </Text>
                  ) : null}
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
                SafeDate™ provides server-backed
                independent session control, private
                check-ins, assistance state and
                safe-arrival confirmation. Location
                protection is explicitly opt-in and
                can continue in the background while
                enabled. Server consent controls its
                expiry. Precise location remains
                private safety data and is not shown
                to your date or included in trusted-
                contact alerts. SafeDate™ does not
                contact emergency services for you.
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
          PRIVATE CHECK-INS · EXPLICIT
          LOCATION CONSENT · BACKGROUND
          PROTECTION WHILE ENABLED ·
          INDEPENDENT END CONTROL ·
          NO EMERGENCY-SERVICE DISPATCH
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  guardianSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    gap: spacing.sm,
  },
  guardianEyebrow: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  guardianTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  guardianBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  guardianButton: {
    minHeight: 82,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
    gap: spacing.xs,
  },
  guardianButtonActive: {
    borderColor: colors.accent,
  },
  guardianButtonTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  guardianButtonBody: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  guardianReference: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
  trustedContactSection: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    gap: spacing.sm,
  },
  trustedContactRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  trustedContactIdentity: {
    flex: 1,
  },
  trustedContactName: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  trustedContactToggle: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  trustedContactToggleActive: {
    borderColor: colors.accent,
  },
  trustedContactToggleText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  trustedContactRemove: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  trustedContactRemoveText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  trustedContactInput: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 15,
  },
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

  locationActive: {
    borderColor: colors.accent,
    borderWidth: 2,
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
