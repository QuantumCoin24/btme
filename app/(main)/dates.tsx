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

export default function DatesScreen() {
  return (
    <AppShellScreen
      eyebrow="DATES"
      title="From match to real life."
      body="Date planning and SafeDate™ will live here when their production safety systems are ready."
    >
      <View style={styles.card}>
        <Text style={styles.label}>
          SAFEDATE™
        </Text>

        <Text style={styles.cardTitle}>
          Safety without killing the vibe.
        </Text>

        <Text style={styles.cardBody}>
          Date planning and safety controls will come
          together here when SafeDate™ is ready.
        </Text>

        <View style={styles.status}>
          <View style={styles.dot} />

          <Text style={styles.statusText}>
            COMING LATER
          </Text>
        </View>
      </View>
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },

  label: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  cardTitle: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
  },

  cardBody: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  status: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },

  statusText: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
