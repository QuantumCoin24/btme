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
  signedTransaction: string,
): Promise<VerificationResponse> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Membership verification is unavailable.");
  }

  const normalizedTransactionId = transactionId.trim();
  const normalizedSignedTransaction = signedTransaction.trim();

  if (!normalizedTransactionId) {
    throw new Error("A StoreKit transaction is required.");
  }

  if (!normalizedSignedTransaction) {
    throw new Error("Apple signed transaction data is required.");
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
        signedTransaction: normalizedSignedTransaction,
      },
    },
  );

  if (error) {
    throw new Error(
      (data as VerificationResponse | null)?.error ||
        error.message ||
        "Unable to verify Apple membership.",
    );
  }

  return (data ?? {}) as VerificationResponse;
}
