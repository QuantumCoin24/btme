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

type PhotoPlaceholderProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function PhotoPlaceholder({
  label,
  selected = false,
  onPress,
}: PhotoPlaceholderProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.box,
        selected && styles.selected,
      ]}
    >
      <View style={styles.icon}>
        <Text style={styles.plus}>
          {selected ? '✓' : '+'}
        </Text>
      </View>

      <Text style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 170,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  selected: {
    borderStyle: 'solid',
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },

  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  plus: {
    color: colors.textPrimary,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '700',
  },

  label: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
