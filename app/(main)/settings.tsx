import {
  Pressable,
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
  colors,
  radius,
  spacing,
} from '../../src/theme/tokens';

const membershipLabels = {
  monthly: 'Monthly',
  'six-month': '6 Months',
  annual: 'Annual',
} as const;

export default function SettingsScreen() {
  const router = useRouter();

  const {
    selectedPlan,
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
            {selectedPlan
              ? `${membershipLabels[selectedPlan]} preference`
              : 'No plan selected'}
          </Text>

          <Text style={styles.cardBody}>
            Membership remains local preview state.
            No purchase or active entitlement is
            represented here.
          </Text>

          <Text style={styles.disclosure}>
            NO PURCHASE · NO ACTIVE ENTITLEMENT
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>
            PRIVACY & DATA
          </Text>

          <Text style={styles.cardTitle}>
            Production controls still required.
          </Text>

          <Text style={styles.cardBody}>
            Data export, retention, privacy choices
            and server-side account deletion will be
            connected during production
            infrastructure work.
          </Text>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerEyebrow}>
            ACCOUNT DELETION
          </Text>

          <Text style={styles.cardTitle}>
            Deletion is not connected yet.
          </Text>

          <Text style={styles.cardBody}>
            This preview does not delete local or
            remote data. Production account deletion
            must remove the member through the real
            backend and meet store requirements.
          </Text>
        </View>

        <Text style={styles.footer}>
          SETTINGS FOUNDATION · NO SERVER ACCOUNT
          CHANGES
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
