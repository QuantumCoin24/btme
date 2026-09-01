import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
} from '../theme/tokens';

type SelectionCardProps = {
  title: string;
  body?: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectionCard({
  title,
  body,
  selected,
  onPress,
}: SelectionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      onPress={onPress}
      style={[
        styles.card,
        selected && styles.selectedCard,
      ]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>
          {title}
        </Text>

        {body ? (
          <Text style={styles.body}>
            {body}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.indicator,
          selected && styles.selectedIndicator,
        ]}
      >
        {selected ? (
          <Text style={styles.check}>
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  selectedCard: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },

  copy: {
    flex: 1,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  body: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedIndicator: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },

  check: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
});
