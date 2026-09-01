import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import {
  colors,
  spacing,
  typography,
} from '../theme/tokens';

type TextButtonProps = {
  label: string;
  onPress: () => void;
};

export function TextButton({
  label,
  onPress,
}: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    padding: spacing.sm,
  },

  label: {
    color: colors.textSecondary,
    ...typography.body,
    fontWeight: '600',
  },
});
