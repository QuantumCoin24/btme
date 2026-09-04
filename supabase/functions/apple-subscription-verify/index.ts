import {
  APIException,
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";

import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const APPLE_ISSUER_ID = Deno.env.get("APPLE_ISSUER_ID");
const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID");
const APPLE_IAP_PRIVATE_KEY = Deno.env.get("APPLE_IAP_PRIVATE_KEY");

const APPLE_ROOT_CA_1 = Deno.env.get("APPLE_ROOT_CA_1");
const APPLE_ROOT_CA_2 = Deno.env.get("APPLE_ROOT_CA_2");
const APPLE_ROOT_CA_3 = Deno.env.get("APPLE_ROOT_CA_3");

const EXPECTED_BUNDLE_ID = "uk.betterthanmyex.app";
const EXPECTED_APP_APPLE_ID = 6808386431;

const ALLOWED_PRODUCT_IDS = new Set([
  "uk.betterthanmyex.app.premium.monthly",
  "uk.betterthanmyex.app.premium.sixmonth",
  "uk.betterthanmyex.app.premium.annual",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function requireServerConfiguration() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase server configuration is incomplete.",
    );
  }

  if (
    !APPLE_ISSUER_ID ||
    !APPLE_KEY_ID ||
    !APPLE_IAP_PRIVATE_KEY
  ) {
    throw new Error(
      "Apple server credentials are incomplete.",
    );
  }

  if (
    !APPLE_ROOT_CA_1 ||
    !APPLE_ROOT_CA_2 ||
    !APPLE_ROOT_CA_3
  ) {
    throw new Error(
      "Apple verification trust anchors are incomplete.",
    );
  }
}

function appleRoots(): Buffer[] {
  return [
    APPLE_ROOT_CA_1!,
    APPLE_ROOT_CA_2!,
    APPLE_ROOT_CA_3!,
  ].map((certificate) =>
    Buffer.from(certificate, "base64")
  );
}

type VerifiedAppleTransaction = {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  environment: "Production" | "Sandbox";
  appAccountToken: string;
  purchaseDate: number;
  signedDate: number;
  expiresDate: number;
  revocationDate?: number | null;
};

function normalizeUuid(value: string) {
  return value.trim().toLowerCase();
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Verified Apple transaction is missing ${field}.`,
    );
  }

  return value.trim();
}

function requireNumber(
  value: unknown,
  field: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Verified Apple transaction is missing ${field}.`,
    );
  }

  return value;
}

function isTransactionNotFound(error: unknown) {
  if (!(error instanceof APIException)) {
    return false;
  }

  return error.apiError === 4040010;
}

async function fetchAndVerifyTransaction(
  transactionId: string,
  environment: Environment,
): Promise<VerifiedAppleTransaction> {
  const client = new AppStoreServerAPIClient(
    APPLE_IAP_PRIVATE_KEY!,
    APPLE_KEY_ID!,
    APPLE_ISSUER_ID!,
    EXPECTED_BUNDLE_ID,
    environment,
  );

  const verifier = new SignedDataVerifier(
    appleRoots(),
    true,
    environment,
    EXPECTED_BUNDLE_ID,
    environment === Environment.PRODUCTION
      ? EXPECTED_APP_APPLE_ID
      : undefined,
  );

  const response =
    await client.getTransactionInfo(transactionId);

  if (!response.signedTransactionInfo) {
    throw new Error(
      "Apple did not return signed transaction information.",
    );
  }

  const decoded =
    await verifier.verifyAndDecodeTransaction(
      response.signedTransactionInfo,
    );

  const verifiedTransactionId = requireString(
    decoded.transactionId,
    "transactionId",
  );

  const originalTransactionId = requireString(
    decoded.originalTransactionId,
    "originalTransactionId",
  );

  const productId = requireString(
    decoded.productId,
    "productId",
  );

  const bundleId = requireString(
    decoded.bundleId,
    "bundleId",
  );

  const appAccountToken = requireString(
    decoded.appAccountToken,
    "appAccountToken",
  );
  const purchaseDate = requireNumber(
    decoded.purchaseDate,
    "purchaseDate",
  );

  const signedDate = requireNumber(
    decoded.signedDate,
    "signedDate",
  );


  const expiresDate = requireNumber(
    decoded.expiresDate,
    "expiresDate",
  );

  const decodedEnvironment =
    requireString(
      decoded.environment,
      "environment",
    );

  const expectedEnvironment =
    environment === Environment.PRODUCTION
      ? "Production"
      : "Sandbox";

  if (decodedEnvironment !== expectedEnvironment) {
    throw new Error(
      "Apple transaction environment mismatch.",
    );
  }

  return {
    transactionId: verifiedTransactionId,
    originalTransactionId,
    productId,
    bundleId,
    environment: expectedEnvironment,
    appAccountToken,
    purchaseDate,
    signedDate,
    expiresDate,
    revocationDate:
      typeof decoded.revocationDate === "number"
        ? decoded.revocationDate
        : null,
  };
}

async function verifyAcrossAppleEnvironments(
  transactionId: string,
) {
  try {
    return await fetchAndVerifyTransaction(
      transactionId,
      Environment.PRODUCTION,
    );
  } catch (error) {
    if (!isTransactionNotFound(error)) {
      throw error;
    }

    return await fetchAndVerifyTransaction(
      transactionId,
      Environment.SANDBOX,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed." },
      405,
    );
  }

  try {
    requireServerConfiguration();

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return json(
        { error: "Authentication required." },
        401,
      );
    }

    const userClient = createClient(
      SUPABASE_URL!,
      SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json(
        { error: "Authentication required." },
        401,
      );
    }

    const body =
      await request.json().catch(() => null);

    const transactionId =
      typeof body?.transactionId === "string"
        ? body.transactionId.trim()
        : "";

    const requestedProductId =
      typeof body?.productId === "string"
        ? body.productId.trim()
        : "";

    if (
      !transactionId ||
      transactionId.length > 128
    ) {
      return json(
        {
          error:
            "Invalid transaction identifier.",
        },
        400,
      );
    }

    if (
      !ALLOWED_PRODUCT_IDS.has(
        requestedProductId,
      )
    ) {
      return json(
        {
          error:
            "Unsupported membership product.",
        },
        400,
      );
    }

    /*
     * The client transaction ID is only a lookup hint.
     *
     * Entitlement authority begins only after Apple's
     * signed transaction has been cryptographically
     * verified.
     */
    const verified =
      await verifyAcrossAppleEnvironments(
        transactionId,
      );

    if (
      verified.bundleId !==
      EXPECTED_BUNDLE_ID
    ) {
      return json(
        {
          error:
            "Apple bundle identifier mismatch.",
          code: "APPLE_BUNDLE_MISMATCH",
        },
        403,
      );
    }

    if (
      verified.transactionId !==
      transactionId
    ) {
      return json(
        {
          error:
            "Apple transaction identifier mismatch.",
          code: "APPLE_TRANSACTION_MISMATCH",
        },
        403,
      );
    }

    if (
      verified.productId !==
        requestedProductId ||
      !ALLOWED_PRODUCT_IDS.has(
        verified.productId,
      )
    ) {
      return json(
        {
          error:
            "Apple product identifier mismatch.",
          code: "APPLE_PRODUCT_MISMATCH",
        },
        403,
      );
    }

    if (
      normalizeUuid(
        verified.appAccountToken,
      ) !== normalizeUuid(user.id)
    ) {
      return json(
        {
          error:
            "This Apple subscription belongs to a different BTME account.",
          code:
            "APPLE_ACCOUNT_TOKEN_MISMATCH",
        },
        403,
      );
    }

    const now = Date.now();

    const isRevoked =
      typeof verified.revocationDate ===
        "number" &&
      verified.revocationDate > 0;

    const isActive =
      !isRevoked &&
      verified.expiresDate > now;

    /*
     * Transaction data alone is not used to invent
     * billing-grace state.
     *
     * Build 29 lifecycle notifications/status handling
     * will authoritatively establish grace_period.
     */
    const entitlementStatus =
      isRevoked
        ? "revoked"
        : isActive
          ? "active"
          : "expired";

    const serviceClient = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const expiresAt =
      new Date(
        verified.expiresDate,
      ).toISOString();

    const revocationDate =
      isRevoked
        ? new Date(
            verified.revocationDate!,
          ).toISOString()
        : null;

    const { error: authorityError } =
      await serviceClient.rpc(
        "apply_verified_apple_subscription",
        {
          p_member_id: user.id,
          p_original_transaction_id:
            verified.originalTransactionId,
          p_latest_transaction_id:
            verified.transactionId,
          p_product_id:
            verified.productId,
          p_environment:
            verified.environment,
          p_app_account_token:
            verified.appAccountToken,
          p_entitlement_status:
            entitlementStatus,
          p_purchase_date: new Date(verified.purchaseDate).toISOString(),
          p_signed_date: new Date(verified.signedDate).toISOString(),
          p_expires_at: expiresAt,
          p_revocation_date:
            revocationDate,
        },
      );

    if (authorityError) {
      console.error(
        "Apple subscription authority rejected verified transaction",
        {
          memberId: user.id,
          transactionId:
            verified.transactionId,
          code: authorityError.code,
        },
      );

      return json(
        {
          error:
            "Unable to activate verified membership.",
          code:
            "APPLE_ENTITLEMENT_AUTHORITY_FAILED",
        },
        409,
      );
    }

    return json({
      verified: true,
      entitlementStatus,
      currentPeriodEndsAt: expiresAt,
      productId: verified.productId,
      environment: verified.environment,
    });
  } catch (error) {
    /*
     * Never return Apple credentials, JWS payloads,
     * private-key material or raw server exceptions.
     */
    console.error(
      "apple-subscription-verify failure",
      error instanceof Error
        ? error.message
        : "Unknown verification failure",
    );

    return json(
      {
        error:
          "Unable to verify Apple membership.",
        code:
          "APPLE_VERIFICATION_FAILED",
      },
      502,
    );
  }
});
