import { Platform } from "react-native";
import {
  endConnection,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  ErrorCode,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from "expo-iap";

import {
  APPLE_PREMIUM_PRODUCT_IDS,
  type ApplePremiumPlan,
  type ApplePremiumProductId,
  getAppleProductIdForPlan,
  isApplePremiumProductId,
} from "./appleProducts";
import { verifyAppleSubscription } from "./appleVerification";

export const APPLE_PURCHASE_AUTHORITY = "server-verified" as const;

export type ApplePurchaseResult = {
  verified: boolean;
  productId: ApplePremiumProductId;
  transactionId: string;
  currentPeriodEndsAt: string | null;
};

type PurchaseSuccessHandler = (
  result: ApplePurchaseResult,
) => void | Promise<void>;

type PurchaseFailureHandler = (
  error: Error,
) => void | Promise<void>;

function requireAppleStorePlatform() {
  if (Platform.OS !== "ios") {
    throw new Error(
      "Apple membership purchases are available on iPhone only.",
    );
  }
}

function requireMemberId(memberId: string) {
  const normalized = memberId.trim();

  if (!normalized) {
    throw new Error(
      "You must be signed in before purchasing membership.",
    );
  }

  return normalized;
}

export function getRequestedAppleProductId(
  plan: ApplePremiumPlan,
) {
  requireAppleStorePlatform();
  return getAppleProductIdForPlan(plan);
}

export function getApplePremiumProductIds() {
  return [...APPLE_PREMIUM_PRODUCT_IDS];
}

async function verifyAndFinishPurchase(
  purchase: Purchase,
): Promise<ApplePurchaseResult | null> {
  if (!isApplePremiumProductId(purchase.productId)) {
    return null;
  }

  const transactionId = purchase.transactionId?.trim();

  if (!transactionId) {
    throw new Error(
      "Apple returned a membership purchase without a transaction identifier.",
    );
  }

  const verification = await verifyAppleSubscription(
    transactionId,
    purchase.productId,
  );

  if (
    verification.verified !== true ||
    verification.entitlementStatus !== "active"
  ) {
    throw new Error(
      verification.error ||
        "Apple membership verification was not accepted.",
    );
  }

  // SECURITY:
  // StoreKit is finished only AFTER BTME's trusted server has
  // cryptographically verified Apple and activated the entitlement.
  await finishTransaction({
    purchase,
    isConsumable: false,
  });

  return {
    verified: true,
    productId: purchase.productId,
    transactionId,
    currentPeriodEndsAt:
      verification.currentPeriodEndsAt ?? null,
  };
}

export async function startAppleMembershipPurchase(
  plan: ApplePremiumPlan,
  memberId: string,
) {
  requireAppleStorePlatform();

  const appAccountToken = requireMemberId(memberId);
  const productId = getAppleProductIdForPlan(plan);

  await requestPurchase({
    request: {
      apple: {
        sku: productId,
        appAccountToken,
      },
    },
    type: "subs",
  });
}

export async function restoreAppleMembershipPurchases() {
  requireAppleStorePlatform();

  const purchases = await getAvailablePurchases();

  const relevant = purchases
    .filter((purchase) =>
      isApplePremiumProductId(purchase.productId),
    )
    .sort(
      (a, b) =>
        (b.transactionDate ?? 0) -
        (a.transactionDate ?? 0),
    );

  const results: ApplePurchaseResult[] = [];

  for (const purchase of relevant) {
    try {
      const result = await verifyAndFinishPurchase(purchase);

      if (result) {
        results.push(result);
      }
    } catch {
      // Restore is best-effort across Apple purchase history.
      // One expired, revoked, stale, or otherwise inactive
      // historical transaction must not abort the full restore.
      continue;
    }
  }

  return results;
}

type PurchaseCancelledHandler = () => void | Promise<void>;

export function isApplePurchaseCancellation(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code ===
      ErrorCode.UserCancelled
  );
}

export function subscribeToAppleMembershipPurchases({
  onVerified,
  onError,
  onCancelled,
}: {
  onVerified: PurchaseSuccessHandler;
  onError: PurchaseFailureHandler;
  onCancelled: PurchaseCancelledHandler;
}) {
  requireAppleStorePlatform();

  let active = true;
  const inFlightTransactionIds = new Set<string>();

  const purchaseSubscription = purchaseUpdatedListener(
    (purchase) => {
      const transactionId = purchase.transactionId?.trim();

      if (
        transactionId &&
        inFlightTransactionIds.has(transactionId)
      ) {
        return;
      }

      if (transactionId) {
        inFlightTransactionIds.add(transactionId);
      }

      void (async () => {
        try {
          const result =
            await verifyAndFinishPurchase(purchase);

          if (active && result) {
            await onVerified(result);
          }
        } catch (caught) {
          if (!active) {
            return;
          }

          await onError(
            caught instanceof Error
              ? caught
              : new Error(
                  "Unable to verify Apple membership.",
                ),
          );
        } finally {
          if (transactionId) {
            inFlightTransactionIds.delete(transactionId);
          }
        }
      })();
    },
  );

  const errorSubscription = purchaseErrorListener(
    (purchaseError) => {
      if (!active) {
        return;
      }

      if (purchaseError.code === ErrorCode.UserCancelled) {
        void onCancelled();
        return;
      }

      const message =
        purchaseError.message ||
        "Apple membership purchase was not completed.";

      void onError(new Error(message));
    },
  );

  return () => {
    active = false;
    purchaseSubscription.remove();
    errorSubscription.remove();
  };
}

export async function connectAppleMembershipStore() {
  requireAppleStorePlatform();
  await initConnection();
}

export async function disconnectAppleMembershipStore() {
  if (Platform.OS !== "ios") {
    return;
  }

  await endConnection();
}
