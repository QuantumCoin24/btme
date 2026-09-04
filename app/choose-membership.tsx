import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  useAppleMembership,
} from '../src/features/membership/AppleMembershipProvider';
import {
  APPLE_PREMIUM_PRODUCTS,
  type ApplePremiumPlan,
} from '../src/features/membership/appleProducts';
import {
  useMembership,
} from '../src/features/membership/MembershipContext';
import {
  colors,
  spacing,
  typography,
} from '../src/theme/tokens';

const plans: {
  value: ApplePremiumPlan;
  title: string;
  billing: string;
  detail: string;
}[] = [
  {
    value: 'monthly',
    title: 'Monthly',
    billing: 'Billed monthly',
    detail: 'Flexible. Stay for as long as it feels right.',
  },
  {
    value: 'six-month',
    title: '6 Months',
    billing: 'Billed every six months',
    detail: 'Give better dating a proper chance.',
  },
  {
    value: 'annual',
    title: 'Annual',
    billing: 'Billed annually',
    detail: 'Our longest membership. Find better for less.',
  },
];

export default function ChooseMembershipScreen() {
  const {
    selectedPlan,
    setSelectedPlan,
  } = useMembership();

  const {
    storeReady,
    productsLoading,
    products,
    purchasing,
    restoring,
    purchaseError,
    purchase,
    restore,
  } = useAppleMembership();

  const priceForPlan = (plan: ApplePremiumPlan) => {
    const productId =
      APPLE_PREMIUM_PRODUCTS[plan].productId;

    return products.find(
      (product) => product.productId === productId,
    )?.displayPrice ?? null;
  };

  const handlePurchase = async () => {
    if (!selectedPlan) {
      return;
    }

    try {
      await purchase(selectedPlan);
    } catch (caught) {
      Alert.alert(
        'Purchase not completed',
        caught instanceof Error
          ? caught.message
          : 'Unable to start your Apple purchase.',
      );
    }
  };

  const handleRestore = async () => {
    try {
      await restore();

      Alert.alert(
        'Membership restored ❤️‍🔥',
        'Your BTME Premium membership has been restored.',
      );
    } catch (caught) {
      Alert.alert(
        'Restore purchases',
        caught instanceof Error
          ? caught.message
          : 'Unable to restore your membership.',
      );
    }
  };

  const selectedPrice = selectedPlan
    ? priceForPlan(selectedPlan)
    : null;

  const unavailable =
    Platform.OS !== 'ios' ||
    !storeReady ||
    productsLoading ||
    products.length === 0;

  return (
    <OnboardingScreen
      footer={
        <View style={styles.footer}>
          <PrimaryButton
            label={
              purchasing
                ? 'Connecting to Apple…'
                : selectedPrice
                  ? `Continue — ${selectedPrice} ❤️‍🔥`
                  : 'Continue ❤️‍🔥'
            }
            disabled={
              !selectedPlan ||
              unavailable ||
              purchasing ||
              restoring
            }
            onPress={() => {
              void handlePurchase();
            }}
          />

          <Pressable
            accessibilityRole="button"
            disabled={
              !storeReady ||
              purchasing ||
              restoring
            }
            onPress={() => {
              void handleRestore();
            }}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreText}>
              {restoring
                ? 'Restoring…'
                : 'Restore Purchases'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          BTME PREMIUM
        </Text>

        <Text style={styles.title}>
          How long are you giving better?
        </Text>

        <Text style={styles.body}>
          Same premium BTME experience. Choose the
          membership that works for you.
        </Text>

        {productsLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>
              Getting Apple prices…
            </Text>
          </View>
        ) : null}

        <View
          accessibilityRole="radiogroup"
          style={styles.plans}
        >
          {plans.map((plan) => {
            const price = priceForPlan(plan.value);

            return (
              <MembershipPlanCard
                key={plan.value}
                title={plan.title}
                billing={
                  price
                    ? `${price} · ${plan.billing}`
                    : plan.billing
                }
                detail={plan.detail}
                selected={
                  selectedPlan === plan.value
                }
                onPress={() =>
                  setSelectedPlan(plan.value)
                }
              />
            );
          })}
        </View>

        {purchaseError ? (
          <Text
            accessibilityRole="alert"
            style={styles.error}
          >
            {purchaseError}
          </Text>
        ) : null}

        <Text style={styles.disclosure}>
          Payment will be charged to your Apple ID.
          Subscription automatically renews unless
          cancelled at least 24 hours before the end of
          the current period. You can manage or cancel
          your subscription in your Apple account
          settings.
        </Text>

        <Text style={styles.storeNote}>
          Prices and currency are supplied by Apple for
          your App Store region.
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
  loading: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    ...typography.body,
  },
  plans: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  error: {
    marginTop: spacing.lg,
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  disclosure: {
    marginTop: spacing.xl,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  storeNote: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  restoreText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
