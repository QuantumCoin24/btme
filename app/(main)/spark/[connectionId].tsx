import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDiscovery } from "../../../src/features/discovery/DiscoveryContext";
import {
  loadSparkMessages,
  sendSparkMessage,
  subscribeToSparkMessages,
  SparkMessage,
} from "../../../src/features/messaging/sparkMessaging";
import { colors, radius, spacing } from "../../../src/theme/tokens";

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function SparkScreen() {
  const router = useRouter();

  const { connectionId } = useLocalSearchParams<{
    connectionId?: string | string[];
  }>();

  const resolvedConnectionId =
    typeof connectionId === "string" ? connectionId : (connectionId?.[0] ?? "");

  const { getConnection, createDatePlan } = useDiscovery();

  const connection = useMemo(
    () => getConnection(resolvedConnectionId),
    [getConnection, resolvedConnectionId],
  );

  const conversationId = connection?.conversationId?.trim() ?? "";

  const [messages, setMessages] = useState<SparkMessage[]>([]);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const [messageError, setMessageError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");

  const [planningDate, setPlanningDate] = useState(false);

  const [dateDay, setDateDay] = useState("");

  const [dateTime, setDateTime] = useState("");

  const [datePlace, setDatePlace] = useState("");

  const [datePlanSaved, setDatePlanSaved] = useState(false);

  const refreshMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    setMessageError(null);

    try {
      const nextMessages = await loadSparkMessages(conversationId);

      setMessages(nextMessages);
    } catch (error) {
      setMessageError(errorMessage(error));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    return subscribeToSparkMessages(
      conversationId,
      (incomingMessage) => {
        setMessages((current) => {
          if (current.some((message) => message.id === incomingMessage.id)) {
            return current;
          }

          return [...current, incomingMessage];
        });
      },
      (message) => {
        setMessageError((current) => current ?? message);
      },
    );
  }, [conversationId]);

  const canSend =
    draft.trim().length > 0 &&
    draft.trim().length <= 4000 &&
    Boolean(connection) &&
    Boolean(conversationId) &&
    !isSendingMessage;

  async function handleSendMessage() {
    if (!canSend) {
      return;
    }

    const body = draft.trim();

    setIsSendingMessage(true);
    setMessageError(null);

    try {
      const sentMessage = await sendSparkMessage(conversationId, body);

      setMessages((current) => [...current, sentMessage]);

      setDraft("");
    } catch (error) {
      setMessageError(errorMessage(error));
    } finally {
      setIsSendingMessage(false);
    }
  }

  const canSaveDate =
    Boolean(connection) &&
    dateDay.trim().length > 0 &&
    dateTime.trim().length > 0 &&
    datePlace.trim().length > 0;

  async function handleSaveDate() {
    if (!canSaveDate) {
      return;
    }

    const createdPlan = await createDatePlan(
      resolvedConnectionId,
      dateDay,
      dateTime,
      datePlace,
    );

    if (!createdPlan) {
      return;
    }

    setDatePlanSaved(true);
    setPlanningDate(false);
    setDateDay("");
    setDateTime("");
    setDatePlace("");
  }

  if (!connection) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingSymbol}>✦</Text>

        <Text style={styles.missingTitle}>Spark unavailable</Text>

        <Text style={styles.missingBody}>
          This connection is not available right now.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to connections"
          onPress={() => router.replace("/(main)/connections")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Back to Connections</Text>
        </Pressable>
      </View>
    );
  }

  if (!conversationId) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingSymbol}>✦</Text>

        <Text style={styles.missingTitle}>Spark is getting ready</Text>

        <Text style={styles.missingBody}>
          Your match exists, but its conversation is not available yet.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to connections"
          onPress={() => router.replace("/(main)/connections")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Back to Connections</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to connections"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backSymbol}>‹</Text>
        </Pressable>

        <View style={styles.headerIdentity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{connection.profile.accent}</Text>
          </View>

          <View style={styles.headerCopy}>
            <Text style={styles.headerName}>
              {connection.profile.firstName}
            </Text>

            <Text style={styles.headerMeta}>
              {connection.profile.compatibility}%{" compatibility"}
            </Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sparkIntro}>
          <Text style={styles.sparkEyebrow}>SPARK™</Text>

          <Text style={styles.sparkTitle}>The match happened.</Text>

          <Text style={styles.sparkBody}>
            You both chose each other. Keep it simple, be yourself, and see
            where the conversation goes.
          </Text>
        </View>

        <View style={styles.connectionCard}>
          <Text style={styles.connectionLabel}>YOUR CONNECTION</Text>

          <Text style={styles.connectionName}>
            {connection.profile.firstName}, {connection.profile.age}
          </Text>

          <Text style={styles.connectionMeta}>
            {connection.profile.city}
            {"  ·  "}
            {connection.connectedAtLabel}
          </Text>
        </View>

        {isLoadingMessages ? (
          <View style={styles.emptyConversation}>
            <Text style={styles.emptyConversationTitle}>
              Loading your Spark…
            </Text>
          </View>
        ) : messages.length > 0 ? (
          <View style={styles.messageList}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.isMine
                    ? styles.messageRowMine
                    : styles.messageRowTheirs,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isMine
                      ? styles.messageBubbleMine
                      : styles.messageBubbleTheirs,
                  ]}
                >
                  <Text style={styles.messageBody}>{message.body}</Text>

                  <Text style={styles.messageMeta}>
                    {message.isMine ? "You" : connection.profile.firstName}
                    {message.createdAtLabel
                      ? ` · ${message.createdAtLabel}`
                      : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyConversation}>
            <Text style={styles.emptyConversationSymbol}>♥</Text>

            <Text style={styles.emptyConversationTitle}>Start the Spark</Text>

            <Text style={styles.emptyConversationBody}>
              You matched. Write the first message below.
            </Text>
          </View>
        )}

        {messageError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{messageError}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading messages"
              onPress={() => void refreshMessages()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.dateCard}>
          <Text style={styles.dateEyebrow}>TAKE IT OFF THE APP</Text>

          <Text style={styles.dateTitle}>Ready to meet?</Text>

          <Text style={styles.dateBody}>
            Plan the date here. Date persistence and SafeDate activation remain
            a separate production phase.
          </Text>

          {datePlanSaved ? (
            <Text style={styles.dateSaved}>Date plan saved.</Text>
          ) : null}

          {planningDate ? (
            <View style={styles.dateForm}>
              <TextInput
                value={dateDay}
                onChangeText={setDateDay}
                placeholder="Day"
                placeholderTextColor={colors.textMuted}
                style={styles.dateInput}
              />

              <TextInput
                value={dateTime}
                onChangeText={setDateTime}
                placeholder="Time"
                placeholderTextColor={colors.textMuted}
                style={styles.dateInput}
              />

              <TextInput
                value={datePlace}
                onChangeText={setDatePlace}
                placeholder="Place"
                placeholderTextColor={colors.textMuted}
                style={styles.dateInput}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save date plan"
                disabled={!canSaveDate}
                onPress={() => void handleSaveDate()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  !canSaveDate && styles.primaryButtonDisabled,
                  pressed && canSaveDate && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Save Date Plan</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Plan a date"
              onPress={() => {
                setDatePlanSaved(false);
                setPlanningDate(true);
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Plan a Date</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={styles.composerArea}>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${connection.profile.firstName}`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            accessibilityLabel="Spark message"
            style={styles.input}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send Spark message"
            disabled={!canSend}
            onPress={() => void handleSendMessage()}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && canSend && styles.pressed,
            ]}
          >
            <Text style={styles.sendSymbol}>
              {isSendingMessage ? "…" : "↑"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.disclosure}>
          Messages are shared with your match
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 78,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === "ios" ? spacing.md : spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  backSymbol: {
    color: colors.textPrimary,
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "300",
  },
  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  headerCopy: {
    marginLeft: spacing.sm,
  },
  headerName: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
  },
  headerMeta: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  headerSpacer: {
    width: 42,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sparkIntro: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sparkEyebrow: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  sparkTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
  },
  sparkBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  connectionCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  connectionLabel: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  connectionName: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
  },
  connectionMeta: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  messageList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  messageRow: {
    width: "100%",
  },
  messageRowMine: {
    alignItems: "flex-end",
  },
  messageRowTheirs: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "84%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  messageBubbleMine: {
    backgroundColor: colors.accent,
  },
  messageBubbleTheirs: {
    backgroundColor: colors.surfaceElevated,
  },
  messageBody: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  messageMeta: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
  },
  emptyConversation: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  emptyConversationSymbol: {
    color: colors.accent,
    fontSize: 25,
    lineHeight: 30,
  },
  emptyConversationTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  emptyConversationBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  dateCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  dateEyebrow: {
    color: colors.accent,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  dateTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
  },
  dateBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  dateSaved: {
    marginTop: spacing.sm,
    color: colors.accent,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  dateForm: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  dateInput: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.3,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 46,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  composerArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composer: {
    minHeight: 52,
    paddingLeft: spacing.md,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.25,
  },
  sendSymbol: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
  },
  disclosure: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pressed: {
    opacity: 0.7,
  },
  missing: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  missingSymbol: {
    color: colors.accent,
    fontSize: 34,
    lineHeight: 40,
  },
  missingTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  missingBody: {
    maxWidth: 290,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
