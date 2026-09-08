import {

  Alert,Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useRouter,
} from 'expo-router';

import {
  useMembership,
} from '../../src/features/membership/MembershipContext';
import {
  useAuth,
} from '../../src/features/auth/AuthContext';
import {
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';
import {
  deleteMyAccount,
} from '../../src/features/account/deleteAccount';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const {
    accessState,
    loading: membershipLoading,
    error: membershipError,
    hasActiveMembership,
    isVerified,
    canDate,
    accessMessage,
    refreshMembership,
  } = useMembership();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </Pressable>

          <Text style={styles.brand}>
            BTME™
          </Text>
        </View>

        <Text style={styles.eyebrow}>
          SETTINGS
        </Text>

        <Text style={styles.title}>
          Your account. Your rules.
        </Text>

        <Text style={styles.body}>
          This is the foundation for profile,
          privacy, safety, membership and account
          controls.
        </Text>

        <SettingCard
          eyebrow="PROFILE"
          title="Manage your profile"
          body="Review the information that shapes your BTME experience."
          action="Open profile manager"
          onPress={() =>
            router.push(
              '/edit-profile' as never,
            )
          }
        />

        <SettingCard
          eyebrow="SAFETY"
          title="Safety Center"
          body="Preview block and report controls for your connections."
          action="Open Safety Center"
          onPress={() =>
            router.push(
              '/safety-center' as never,
            )
          }
        />

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>
            MEMBERSHIP
          </Text>

          <Text style={styles.cardTitle}>
            {membershipLoading
              ? 'Checking membership…'
              : hasActiveMembership
                ? 'BTME Premium active'
                : 'Premium membership required'}
          </Text>

          <Text style={styles.cardBody}>
            {membershipLoading
              ? 'BTME is securely checking your membership status.'
              : hasActiveMembership
                ? `Your ${accessState?.entitlementTier ?? 'premium'} entitlement is active and server verified.`
                : accessMessage}
          </Text>

          <Text style={styles.disclosure}>
            {hasActiveMembership
              ? `PREMIUM · ${(accessState?.entitlementStatus ?? 'active').toUpperCase()}`
              : 'NO ACTIVE PREMIUM ENTITLEMENT'}
          </Text>

          {membershipError ? (
            <Text style={styles.cardBody}>
              {membershipError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hasActiveMembership
                ? 'Refresh membership'
                : 'Choose membership'
            }
            onPress={() => {
              if (hasActiveMembership) {
                void refreshMembership();
                return;
              }

              router.push('/choose-membership' as never);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {hasActiveMembership
                ? 'Refresh membership'
                : 'Choose membership'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>
            PRIVACY & DATA
          </Text>
          <Text style={styles.cardTitle}>
            Your privacy matters.
          </Text>
          <Text style={styles.cardBody}>
            BTME protects your profile and safety data
            behind your authenticated account. You can
            permanently delete your account and
            associated BTME data below.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>
            ACCOUNT
          </Text>
          <Text style={styles.cardTitle}>
            Log out of BTME
          </Text>
          <Text style={styles.cardBody}>
            Sign out of this account on this device.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={async () => {
              await signOut();
              router.replace('/welcome' as never);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Log out
            </Text>
          </Pressable>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerEyebrow}>
            ACCOUNT DELETION
          </Text>
          <Text style={styles.cardTitle}>
            Permanently delete account
          </Text>
          <Text style={styles.cardBody}>
            Delete your BTME account, profile,
            membership record, connections, SafeDate
            records and private profile media. This
            action cannot be undone.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account permanently"
            onPress={() => {
              Alert.alert(
                'Delete BTME account?',
                'This permanently deletes your BTME account and associated data. This cannot be undone.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Delete account',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        'Final confirmation',
                        'Are you absolutely sure? Your account cannot be recovered after deletion.',
                        [
                          {
                            text: 'Keep account',
                            style: 'cancel',
                          },
                          {
                            text: 'Delete permanently',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deleteMyAccount();
                                router.replace(
                                  '/welcome' as never
                                );
                              } catch (error) {
                                Alert.alert(
                                  'Account deletion failed',
                                  error instanceof Error
                                    ? error.message
                                    : 'BTME could not delete your account. Please try again.'
                                );
                              }
                            },
                          },
                        ]
                      );
                    },
                  },
                ]
              );
            }}
            style={styles.dangerButton}
          >
            <Text style={styles.dangerButtonText}>
              Delete account
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          BTME™ ACCOUNT & SAFETY CONTROLS
        </Text>
      </ScrollView>
    </View>
  );
}

function SettingCard({
  eyebrow,
  title,
  body,
  action,
  onPress,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.cardTitle}>
        {title}
      </Text>

      <Text style={styles.cardBody}>
        {body}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={onPress}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 30,
  },
  brand: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  eyebrow: {
    marginTop: spacing.xl,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '800',
  },
  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  dangerCard: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  cardEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  dangerButton: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  dangerEyebrow: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  cardTitle: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  cardBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    marginTop: spacing.md,
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  disclosure: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  footer: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
