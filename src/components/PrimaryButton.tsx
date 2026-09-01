import {
  Pressable,
  StyleProp,
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
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  style,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed &&
          !disabled &&
          styles.pressed,
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
    minHeight: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  pressed: {
    backgroundColor: colors.accentPressed,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  disabled: {
    opacity: 0.45,
  },

  label: {
    color: colors.textPrimary,
    ...typography.button,
    fontWeight: '800',
    textAlign: 'center',
  },
});
