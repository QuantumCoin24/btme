import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppShellScreen,
} from '../../src/components/AppShellScreen';
import {
  useDiscovery,
} from '../../src/features/discovery/DiscoveryContext';
import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

export default function ConnectionsScreen() {
  const router = useRouter();

  const {
    connections,
  } = useDiscovery();

  return (
    <AppShellScreen
      eyebrow="CONNECTIONS"
      title="Chemistry starts here."
      body="The people you choose to explore further will appear here while the full mutual-match system is built."
    >
      {connections.length > 0 ? (
        <View style={styles.list}>
          {connections.map((connection) => (
            <Pressable
              key={connection.id}
              accessibilityRole="button"
              accessibilityLabel={`Open Spark with ${connection.profile.firstName}`}
              onPress={() =>
                router.push({
                  pathname:
                    '/spark/[connectionId]',
                  params: {
                    connectionId: connection.id,
                  },
                })
              }
              style={({ pressed }) => [
                styles.connection,
                pressed && styles.connectionPressed,
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {connection.profile.accent}
                </Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.name}>
                  {connection.profile.firstName},{' '}
                  {connection.profile.age}
                </Text>

                <Text style={styles.meta}>
                  {connection.profile.city}
                  {'  ·  '}
                  {connection.profile.compatibility}%
                  {' compatibility'}
                </Text>

                <Text style={styles.status}>
                  {connection.connectedAtLabel}
                </Text>
              </View>

              <Text style={styles.heart}>
                ♥
              </Text>
            </Pressable>
          ))}

          <View style={styles.messageNote}>
            <Text style={styles.messageNoteTitle}>
              Spark™ comes next.
            </Text>

            <Text style={styles.messageNoteBody}>
              This preview stores your choices
              locally. Mutual matching and messaging
              are not active yet.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.symbol}>
            ✦
          </Text>

          <Text style={styles.emptyTitle}>
            No connections yet
          </Text>

          <Text style={styles.emptyBody}>
            Choose an introduction in Discover and
            it will appear here for this preview.
          </Text>
        </View>
      )}
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  connection: {
    minHeight: 96,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionPressed: {
    opacity: 0.72,
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
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  details: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  meta: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  status: {
    marginTop: spacing.xs,
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heart: {
    marginLeft: spacing.sm,
    color: colors.accent,
    fontSize: 18,
    lineHeight: 22,
  },
  messageNote: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  messageNoteTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  messageNoteBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  empty: {
    marginTop: spacing.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  symbol: {
    color: colors.accent,
    fontSize: 34,
    lineHeight: 40,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
