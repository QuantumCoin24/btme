import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/tokens';

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.heart, compact && styles.heartCompact]}>
        ♥
      </Text>

      <Text style={[styles.btme, compact && styles.btmeCompact]}>
        BTME™
      </Text>

      {!compact && (
        <Text style={styles.fullName}>
          BETTER THAN MY EX™
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },

  heart: {
    color: colors.accent,
    fontSize: 40,
    lineHeight: 46,
    marginBottom: 18,
  },

  heartCompact: {
    fontSize: 25,
    lineHeight: 30,
    marginBottom: 8,
  },

  btme: {
    color: colors.textPrimary,
    fontSize: 58,
    lineHeight: 64,
    fontWeight: '700',
    letterSpacing: 3,
  },

  btmeCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 1.8,
  },

  fullName: {
    marginTop: 10,
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
