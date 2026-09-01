import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRouter,
} from 'expo-router';

import {
  PrimaryButton,
} from '../src/components/PrimaryButton';

import {
  Screen,
} from '../src/components/Screen';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../src/theme/tokens';

const propositions = [
  {
    number: '01',
    title: 'REAL PEOPLE',
    copy: 'Verified members. No pretending.',
  },
  {
    number: '02',
    title: 'BETTER MATCHES',
    copy: 'Compatibility over popularity.',
  },
  {
    number: '03',
    title: 'SAFER DATES',
    copy: 'SafeDate™ protects your first meeting.',
  },
] as const;

export default function PropositionScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          WHY BTME™
        </Text>

        <Text style={styles.title}>
          Less swiping.{'\n'}More dating.
        </Text>

        <Text style={styles.subtitle}>
          Built for people who actually want to meet someone.
        </Text>
      </View>

      <View style={styles.cards}>
        {propositions.map((item) => (
          <View
            key={item.number}
            style={styles.card}
          >
            <Text style={styles.number}>
              {item.number}
            </Text>

            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>
                {item.title}
              </Text>

              <Text style={styles.cardBody}>
                {item.copy}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Sounds better →"
          onPress={() => router.push('/join')}
        />

        <Text
          onPress={() => router.back()}
          style={styles.back}
        >
          Back
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
  },

  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
  },

  title: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    ...typography.title,
  },

  subtitle: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
    maxWidth: 350,
  },

  cards: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },

  card: {
    flexDirection: 'row',
    minHeight: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },

  number: {
    width: 48,
    color: colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  cardCopy: {
    flex: 1,
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  cardBody: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },

  footer: {
    paddingBottom: spacing.md,
  },

  back: {
    marginTop: spacing.md,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
});
