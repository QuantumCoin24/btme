import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppShellScreen,
} from '../../src/components/AppShellScreen';
import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

export default function ConnectionsScreen() {
  return (
    <AppShellScreen
      eyebrow="CONNECTIONS"
      title="Chemistry starts here."
      body="When two people choose each other, the connection belongs here — without follower counts, popularity scores or attention games."
    >
      <View style={styles.empty}>
        <Text style={styles.symbol}>
          ✦
        </Text>

        <Text style={styles.emptyTitle}>
          No connections yet
        </Text>

        <Text style={styles.emptyBody}>
          When the feeling is mutual, your connections
          will appear here.
        </Text>
      </View>
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
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
