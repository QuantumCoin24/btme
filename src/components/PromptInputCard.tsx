import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
} from '../theme/tokens';

type PromptInputCardProps = {
  value: string;
  onChangeText: (
    value: string,
  ) => void;
  placeholder: string;
  maxLength?: number;
};

export function PromptInputCard({
  value,
  onChangeText,
  placeholder,
  maxLength = 160,
}: PromptInputCardProps) {
  return (
    <View style={styles.card}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          colors.textMuted
        }
        multiline
        maxLength={maxLength}
        autoCorrect
        autoCapitalize="sentences"
        selectionColor={colors.accent}
        textAlignVertical="top"
        style={styles.input}
      />

      <Text style={styles.counter}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 210,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  input: {
    flex: 1,
    minHeight: 140,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '600',
  },

  counter: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
});
