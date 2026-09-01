import {
  ReactNode,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  colors,
  spacing,
  typography,
} from '../theme/tokens';

type AppShellScreenProps = {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
};

export function AppShellScreen({
  eyebrow,
  title,
  body,
  children,
}: AppShellScreenProps) {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <Text style={styles.heart}>
              ♥
            </Text>

            <Text style={styles.wordmark}>
              BTME™
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {eyebrow}
          </Text>

          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.body}>
            {body}
          </Text>
        </View>

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  heart: {
    color: colors.accent,
    fontSize: 22,
    lineHeight: 26,
  },

  wordmark: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  hero: {
    marginTop: spacing.xxl,
  },

  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
  },

  title: {
    marginTop: spacing.md,
    maxWidth: 350,
    color: colors.textPrimary,
    ...typography.title,
  },

  body: {
    marginTop: spacing.md,
    maxWidth: 350,
    color: colors.textSecondary,
    ...typography.body,
  },
});
