import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

type FormInputProps = {
  label?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
} & TextInputProps;

export function FormInput({
  label,
  error,
  keyboardType,
  ...props
}: FormInputProps) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
        </Text>
      ) : null}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardAppearance="dark"
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          error ? styles.inputError : null,
        ]}
        {...props}
      />

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  input: {
    minHeight: 62,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    lineHeight: 24,
  },

  inputError: {
    borderColor: colors.danger,
  },

  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
