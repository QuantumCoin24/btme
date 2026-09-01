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

export default function DiscoverScreen() {
  return (
    <AppShellScreen
      eyebrow="DISCOVER"
      title="Someone better is out there."
      body="Your future introductions will live here — shaped by compatibility, intention and the things that actually matter."
    >
      <View style={styles.stage}>
        <View style={styles.glow}>
          <Text style={styles.heart}>
            ♥
          </Text>
        </View>

        <Text style={styles.stageTitle}>
          Your next introduction
        </Text>

        <Text style={styles.stageBody}>
          Your introductions will appear here when
          discovery is ready.
        </Text>
      </View>
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 390,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  glow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },

  heart: {
    color: colors.accent,
    fontSize: 38,
    lineHeight: 44,
  },

  stageTitle: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    textAlign: 'center',
  },

  stageBody: {
    marginTop: spacing.sm,
    maxWidth: 280,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
