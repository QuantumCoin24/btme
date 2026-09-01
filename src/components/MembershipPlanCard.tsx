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

type MembershipPlanCardProps = {
  title: string;
  billing: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
};

export function MembershipPlanCard({
  title,
  billing,
  detail,
  selected,
  onPress,
}: MembershipPlanCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{
        checked: selected,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.billing}>
          {billing}
        </Text>

        <Text style={styles.detail}>
          {detail}
        </Text>
      </View>

      <View
        style={[
          styles.radio,
          selected && styles.radioSelected,
        ]}
      >
        {selected ? (
          <View style={styles.radioDot} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 108,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },

  pressed: {
    opacity: 0.86,
  },

  copy: {
    flex: 1,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },

  billing: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },

  detail: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: colors.accent,
  },

  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
});
