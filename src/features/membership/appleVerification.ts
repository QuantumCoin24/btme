import { isSupabaseConfigured, supabase } from "../../lib/supabase";

import {
  isApplePremiumProductId,
  type ApplePremiumProductId,
} from "./appleProducts";

type VerificationResponse = {
  verified?: boolean;
  entitlementStatus?: string;
  currentPeriodEndsAt?: string | null;
  error?: string;
  code?: string;
};

export async function verifyAppleSubscription(
  transactionId: string,
  productId: ApplePremiumProductId,
): Promise<VerificationResponse> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Membership verification is unavailable.");
  }

  const normalizedTransactionId = transactionId.trim();

  if (!normalizedTransactionId) {
    throw new Error("A StoreKit transaction is required.");
  }

  if (!isApplePremiumProductId(productId)) {
    throw new Error("Unsupported Apple membership product.");
  }

  const { data, error } = await supabase.functions.invoke(
    "apple-subscription-verify",
    {
      body: {
        transactionId: normalizedTransactionId,
        productId,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to verify Apple membership.");
  }

  return (data ?? {}) as VerificationResponse;
}
