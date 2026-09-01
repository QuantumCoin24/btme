import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  pressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.985 }],
  },

  label: {
    color: colors.textPrimary,
    ...typography.button,
  },
});
