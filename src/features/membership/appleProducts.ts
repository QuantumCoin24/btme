export const APPLE_SUBSCRIPTION_GROUP = "btme-premium";

export const APPLE_PREMIUM_PRODUCTS = {
  monthly: {
    productId: "uk.betterthanmyex.app.premium.monthly",
    duration: "monthly",
  },
  "six-month": {
    productId: "uk.betterthanmyex.app.premium.sixmonth",
    duration: "six-month",
  },
  annual: {
    productId: "uk.betterthanmyex.app.premium.annual",
    duration: "annual",
  },
} as const;

export type ApplePremiumPlan = keyof typeof APPLE_PREMIUM_PRODUCTS;

export type ApplePremiumProductId =
  (typeof APPLE_PREMIUM_PRODUCTS)[ApplePremiumPlan]["productId"];

export const APPLE_PREMIUM_PRODUCT_IDS = Object.values(
  APPLE_PREMIUM_PRODUCTS,
).map(({ productId }) => productId) as ApplePremiumProductId[];

export function getAppleProductIdForPlan(
  plan: ApplePremiumPlan,
): ApplePremiumProductId {
  return APPLE_PREMIUM_PRODUCTS[plan].productId;
}

export function isApplePremiumProductId(
  value: string,
): value is ApplePremiumProductId {
  return APPLE_PREMIUM_PRODUCT_IDS.includes(value as ApplePremiumProductId);
}
