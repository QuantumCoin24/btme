import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  MembershipPlanCard,
} from '../src/components/MembershipPlanCard';
import {
  OnboardingScreen,
} from '../src/components/OnboardingScreen';
import {
  PrimaryButton,
} from '../src/components/PrimaryButton';
import {
  useMembership,
} from '../src/features/membership/MembershipContext';
import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const plans = [
  {
    value: 'monthly',
    title: 'Monthly',
    billing: 'Flexible monthly membership',
    detail:
      'A flexible starting point for the membership preview.',
  },
  {
    value: 'six-month',
    title: '6 Months',
    billing: 'Six-month membership',
    detail:
      'For people giving better dating a proper chance.',
  },
  {
    value: 'annual',
    title: 'Annual',
    billing: 'Twelve-month membership',
    detail:
      'The longest membership period in this preview.',
  },
] as const;

export default function ChooseMembershipScreen() {
  const {
    selectedPlan,
    setSelectedPlan,
  } = useMembership();

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          label="Continue ❤️‍🔥"
          disabled={!selectedPlan}
          onPress={() =>
            router.push('/membership-preview')
          }
        />
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          CHOOSE YOUR MEMBERSHIP
        </Text>

        <Text style={styles.title}>
          How long are you giving better?
        </Text>

        <Text style={styles.body}>
          Same BTME experience. Choose the billing
          period that suits you.
        </Text>

        <View
          accessibilityRole="radiogroup"
          style={styles.plans}
        >
          {plans.map((plan) => (
            <MembershipPlanCard
              key={plan.value}
              title={plan.title}
              billing={plan.billing}
              detail={plan.detail}
              selected={
                selectedPlan === plan.value
              }
              onPress={() =>
                setSelectedPlan(plan.value)
              }
            />
          ))}
        </View>

        <Text style={styles.disclosure}>
          Prices are intentionally not shown yet.
          Final products, pricing, renewal terms and
          purchase disclosures will come from the
          production store billing integration.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
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

  body: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.body,
  },

  plans: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },

  disclosure: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
