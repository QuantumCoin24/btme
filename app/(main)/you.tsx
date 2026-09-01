import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppShellScreen,
} from '../../src/components/AppShellScreen';
import {
  useOnboarding,
} from '../../src/features/onboarding/OnboardingContext';
import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

export default function YouScreen() {
  const {
    firstName,
    city,
  } = useOnboarding();

  return (
    <AppShellScreen
      eyebrow="YOU"
      title={firstName ? `${firstName}, this is yours.` : 'This is yours.'}
      body="Your profile, preferences, membership and safety controls will come together here."
    >
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {firstName
              ? firstName.charAt(0).toUpperCase()
              : '♥'}
          </Text>
        </View>

        <View style={styles.identity}>
          <Text style={styles.name}>
            {firstName || 'Your profile'}
          </Text>

          <Text style={styles.city}>
            {city || 'Location not set'}
          </Text>
        </View>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>
          Profile foundation
        </Text>

        <Text style={styles.noteBody}>
          Your identity, preferences and profile details
          will come together here.
        </Text>
      </View>
    </AppShellScreen>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },

  avatarText: {
    color: colors.accent,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '800',
  },

  identity: {
    flex: 1,
  },

  name: {
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },

  city: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },

  note: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  noteTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },

  noteBody: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
