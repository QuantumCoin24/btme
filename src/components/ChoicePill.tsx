import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
} from '../theme/tokens';

type ChoicePillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function ChoicePill({
  label,
  selected,
  onPress,
}: ChoicePillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      onPress={onPress}
      style={[
        styles.pill,
        selected && styles.selectedPill,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

  selectedPill: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },

  selectedLabel: {
    color: colors.textPrimary,
  },
});
