import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useMemo,
  useState,
} from 'react';
import {
  useDiscovery,
} from '../../../src/features/discovery/DiscoveryContext';
import {
  colors,
  radius,
  spacing,
} from '../../../src/theme/tokens';

export default function SparkScreen() {
  const router = useRouter();

  const {
    connectionId,
  } = useLocalSearchParams<{
    connectionId?: string | string[];
  }>();

  const resolvedConnectionId =
    typeof connectionId === 'string'
      ? connectionId
      : connectionId?.[0] ?? '';

  const {
    getConnection,
    getSparkMessages,
    addSparkMessage,
  } = useDiscovery();

  const connection = useMemo(
    () => getConnection(resolvedConnectionId),
    [
      getConnection,
      resolvedConnectionId,
    ],
  );

  const messages = getSparkMessages(
    resolvedConnectionId,
  );

  const [
    draft,
    setDraft,
  ] = useState('');

  const canAdd =
    draft.trim().length > 0 &&
    Boolean(connection);

  function handleAddMessage() {
    if (!canAdd) {
      return;
    }

    addSparkMessage(
      resolvedConnectionId,
      draft,
    );

    setDraft('');
  }

  if (!connection) {
    return (
      <View style={styles.screen}>
        <View style={styles.safeTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to connections"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backSymbol}>
              ‹
            </Text>
          </Pressable>
        </View>

        <View style={styles.missing}>
          <Text style={styles.missingSymbol}>
            ✦
          </Text>

          <Text style={styles.missingTitle}>
            Connection unavailable
          </Text>

          <Text style={styles.missingBody}>
            This local Spark preview needs an
            active connection.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
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
          <Text style={styles.backSymbol}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {connection.profile.accent}
            </Text>
          </View>

          <View style={styles.identityCopy}>
            <Text style={styles.name}>
              {connection.profile.firstName}
            </Text>

            <Text style={styles.compatibility}>
              {connection.profile.compatibility}%
              {' compatibility'}
            </Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={
          styles.messagesContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sparkIntro}>
          <Text style={styles.sparkEyebrow}>
            SPARK™
          </Text>

          <Text style={styles.sparkTitle}>
            Well, this is promising.
          </Text>

          <Text style={styles.sparkBody}>
            You chose to explore this connection
            in the local preview. When production
            matching and messaging are connected,
            your conversation can begin here.
          </Text>

          <View style={styles.signal}>
            <Text style={styles.signalValue}>
              {connection.profile.compatibility}%
            </Text>

            <Text style={styles.signalLabel}>
              COMPATIBILITY
            </Text>
          </View>
        </View>

        {messages.length > 0 ? (
          <View style={styles.messageList}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={styles.messageRow}
              >
                <View style={styles.messageBubble}>
                  <Text style={styles.messageBody}>
                    {message.body}
                  </Text>

                  <Text style={styles.messageMeta}>
                    YOUR LOCAL PREVIEW ·{' '}
                    {message.createdAtLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyConversation}>
            <Text style={styles.emptySymbol}>
              ♥
            </Text>

            <Text style={styles.emptyTitle}>
              Start with something real.
            </Text>

            <Text style={styles.emptyBody}>
              Write a first message below.
              It stays on this device as
              preview state and is not sent
              to another person.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Spark message"
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something worth replying to…"
            placeholderTextColor={
              colors.textMuted
            }
            multiline
            maxLength={500}
            style={styles.input}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add local preview message"
            disabled={!canAdd}
            onPress={handleAddMessage}
            style={({ pressed }) => [
              styles.sendButton,
              !canAdd &&
                styles.sendButtonDisabled,
              pressed &&
                canAdd &&
                styles.pressed,
            ]}
          >
            <Text style={styles.sendSymbol}>
              ↑
            </Text>
          </Pressable>
        </View>

        <Text style={styles.disclosure}>
          Preview only · messages are not sent
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
  safeTop: {
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: 58,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSymbol: {
    marginTop: -3,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '300',
  },
  identity: {
    flex: 1,
    marginHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  identityCopy: {
    marginLeft: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  compatibility: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 46,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  sparkIntro: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sparkEyebrow: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sparkTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  sparkBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  signal: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  signalValue: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  signalLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  messageList: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  messageRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '84%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  messageBody: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  messageMeta: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    opacity: 0.72,
  },
  emptyConversation: {
    flex: 1,
    minHeight: 250,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySymbol: {
    color: colors.accent,
    fontSize: 28,
    lineHeight: 34,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    maxWidth: 290,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  composerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composer: {
    minHeight: 56,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.25,
  },
  sendSymbol: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  disclosure: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.7,
  },
  missing: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '900',
  },
  missingBody: {
    maxWidth: 280,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
