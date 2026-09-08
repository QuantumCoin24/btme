import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";
import { X509, KJUR } from "jsrsasign";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const APPLE_ROOT_CA_1 = Deno.env.get("APPLE_ROOT_CA_1");
const APPLE_ROOT_CA_2 = Deno.env.get("APPLE_ROOT_CA_2");
const APPLE_ROOT_CA_3 = Deno.env.get("APPLE_ROOT_CA_3");

const EXPECTED_BUNDLE_ID = "uk.betterthanmyex.app";

const ALLOWED_PRODUCT_IDS = new Set([
  "uk.betterthanmyex.app.premium.monthly",
  "uk.betterthanmyex.app.premium.sixmonth",
  "uk.betterthanmyex.app.premium.annual",
]);

const APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1";
const APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";
const MAX_CLOCK_SKEW_MS = 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function rejection(error: string, code: string) {
  return json({
    verified: false,
    error,
    code,
  });
}

function requireServerConfiguration() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration is incomplete.");
  }

  if (!APPLE_ROOT_CA_1 || !APPLE_ROOT_CA_2 || !APPLE_ROOT_CA_3) {
    throw new Error("Apple verification trust anchors are incomplete.");
  }
}

function normalizeUuid(value: string) {
  return value.trim().toLowerCase();
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Verified Apple transaction is missing ${field}.`);
  }

  return value.trim();
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Verified Apple transaction is missing ${field}.`);
  }

  return value;
}

function decodeBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4),
    "base64",
  );
}

function decodeJsonPart(
  value: string,
  label: string,
): Record<string, unknown> {
  try {
    return JSON.parse(decodeBase64Url(value).toString("utf8"));
  } catch {
    throw new Error(`Apple signed transaction ${label} is malformed.`);
  }
}

function certFromBase64(value: string): X509 {
  const cert = new X509();
  cert.readCertHex(Buffer.from(value, "base64").toString("hex"));
  return cert;
}

function certFromRootSecret(value: string): X509 {
  const cert = new X509();
  const trimmed = value.trim();

  if (trimmed.includes("BEGIN CERTIFICATE")) {
    cert.readCertPEM(trimmed);
  } else {
    cert.readCertHex(Buffer.from(trimmed, "base64").toString("hex"));
  }

  return cert;
}

function certDateMs(value: string): number {
  const match =
    /^(\d{2}|\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(value);

  if (!match) {
    throw new Error("Apple signing certificate validity date is malformed.");
  }

  const year =
    match[1].length === 2
      ? Number(match[1]) >= 50
        ? 1900 + Number(match[1])
        : 2000 + Number(match[1])
      : Number(match[1]);

  return Date.UTC(
    year,
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
}

function checkCertificateDates(
  certificate: X509,
  effectiveDateMs: number,
) {
  const validFrom = certDateMs(certificate.getNotBefore());
  const validTo = certDateMs(certificate.getNotAfter());

  if (
    validFrom > effectiveDateMs + MAX_CLOCK_SKEW_MS ||
    validTo < effectiveDateMs - MAX_CLOCK_SKEW_MS
  ) {
    throw new Error(
      "Apple signing certificate is outside its validity period.",
    );
  }
}

function verifyCertSignature(child: X509, issuer: X509) {
  try {
    return child.verifySignature(issuer.getPublicKey());
  } catch {
    return false;
  }
}

function verifyCertificateChain(
  x5c: unknown,
  signedDate: number,
) {
  if (
    !Array.isArray(x5c) ||
    x5c.length !== 3 ||
    x5c.some(
      (value) => typeof value !== "string" || !value,
    )
  ) {
    throw new Error(
      "Apple signed transaction certificate chain is invalid.",
    );
  }

  let leaf: X509;
  let intermediate: X509;

  try {
    leaf = certFromBase64(x5c[0] as string);
    intermediate = certFromBase64(x5c[1] as string);
  } catch {
    throw new Error(
      "Apple signed transaction certificate chain is malformed.",
    );
  }

  if (!verifyCertSignature(leaf, intermediate)) {
    throw new Error(
      "Apple signing leaf certificate signature is invalid.",
    );
  }

  const roots = [
    APPLE_ROOT_CA_1!,
    APPLE_ROOT_CA_2!,
    APPLE_ROOT_CA_3!,
  ].map(certFromRootSecret);

  const trustedRoot = roots.find((root) =>
    verifyCertSignature(intermediate, root)
  );

  if (!trustedRoot) {
    throw new Error(
      "Apple signing certificate chain is not anchored to a configured Apple root.",
    );
  }

  if (leaf.getExtInfo(APPLE_LEAF_OID) === undefined) {
    throw new Error(
      "Apple signing leaf certificate is missing the required Apple extension.",
    );
  }

  if (
    intermediate.getExtInfo(APPLE_INTERMEDIATE_OID) === undefined
  ) {
    throw new Error(
      "Apple signing intermediate certificate is missing the required Apple extension.",
    );
  }

  checkCertificateDates(leaf, signedDate);
  checkCertificateDates(intermediate, signedDate);
  checkCertificateDates(trustedRoot, signedDate);

  return leaf.getPublicKey();
}

function verifySignedTransaction(signedTransaction: string) {
  const parts = signedTransaction.split(".");

  if (parts.length !== 3) {
    throw new Error("Apple signed transaction is malformed.");
  }

  const header = decodeJsonPart(parts[0], "header");
  const decoded = decodeJsonPart(parts[1], "payload");

  if (header.alg !== "ES256") {
    throw new Error(
      "Apple signed transaction algorithm is invalid.",
    );
  }

  const signedDate = requireNumber(
    decoded.signedDate,
    "signedDate",
  );

  const publicKey = verifyCertificateChain(
    header.x5c,
    signedDate,
  );

  let valid = false;

  try {
    valid = KJUR.jws.JWS.verify(
      signedTransaction,
      publicKey,
      ["ES256"],
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    throw new Error(
      "Apple signed transaction signature verification failed.",
    );
  }

  const environment = requireString(
    decoded.environment,
    "environment",
  );

  if (
    environment !== "Sandbox" &&
    environment !== "Production"
  ) {
    throw new Error(
      "Apple signed transaction environment is invalid.",
    );
  }

  const bundleId = requireString(
    decoded.bundleId,
    "bundleId",
  );

  if (bundleId !== EXPECTED_BUNDLE_ID) {
    throw new Error(
      "Apple transaction bundle identifier mismatch.",
    );
  }

  return {
    transactionId: requireString(
      decoded.transactionId,
      "transactionId",
    ),
    originalTransactionId: requireString(
      decoded.originalTransactionId,
      "originalTransactionId",
    ),
    productId: requireString(
      decoded.productId,
      "productId",
    ),
    bundleId,
    environment,
    appAccountToken: requireString(
      decoded.appAccountToken,
      "appAccountToken",
    ),
    purchaseDate: requireNumber(
      decoded.purchaseDate,
      "purchaseDate",
    ),
    signedDate,
    expiresDate: requireNumber(
      decoded.expiresDate,
      "expiresDate",
    ),
    revocationDate:
      typeof decoded.revocationDate === "number"
        ? decoded.revocationDate
        : null,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    requireServerConfiguration();

    const authorization =
      request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return rejection(
        "Authentication required.",
        "AUTHENTICATION_REQUIRED",
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
      return rejection(
        "Authentication required.",
        "AUTHENTICATION_REQUIRED",
      );
    }

    const body = await request.json().catch(
      () => null,
    );

    const transactionId =
      typeof body?.transactionId === "string"
        ? body.transactionId.trim()
        : "";

    const requestedProductId =
      typeof body?.productId === "string"
        ? body.productId.trim()
        : "";

    const signedTransaction =
      typeof body?.signedTransaction === "string"
        ? body.signedTransaction.trim()
        : "";

    if (!transactionId || transactionId.length > 128) {
      return rejection(
        "Invalid transaction identifier.",
        "APPLE_TRANSACTION_INVALID",
      );
    }

    if (!ALLOWED_PRODUCT_IDS.has(requestedProductId)) {
      return rejection(
        "Unsupported membership product.",
        "APPLE_PRODUCT_UNSUPPORTED",
      );
    }

    if (
      !signedTransaction ||
      signedTransaction.length > 32768
    ) {
      return rejection(
        "Apple signed transaction data is required.",
        "APPLE_SIGNED_TRANSACTION_REQUIRED",
      );
    }

    const verified = verifySignedTransaction(
      signedTransaction,
    );

    if (verified.transactionId !== transactionId) {
      return rejection(
        "Apple transaction identifier mismatch.",
        "APPLE_TRANSACTION_MISMATCH",
      );
    }

    if (
      verified.productId !== requestedProductId ||
      !ALLOWED_PRODUCT_IDS.has(verified.productId)
    ) {
      return rejection(
        "Apple product identifier mismatch.",
        "APPLE_PRODUCT_MISMATCH",
      );
    }

    if (
      normalizeUuid(verified.appAccountToken) !==
      normalizeUuid(user.id)
    ) {
      return rejection(
        "This Apple subscription belongs to a different BTME account.",
        "APPLE_ACCOUNT_TOKEN_MISMATCH",
      );
    }

    const now = Date.now();

    const isRevoked =
      typeof verified.revocationDate === "number" &&
      verified.revocationDate > 0;

    const isActive =
      !isRevoked &&
      verified.expiresDate > now;

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
          p_purchase_date:
            new Date(
              verified.purchaseDate,
            ).toISOString(),
          p_signed_date:
            new Date(
              verified.signedDate,
            ).toISOString(),
          p_expires_at:
            expiresAt,
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
          code:
            authorityError.code,
          message:
            authorityError.message,
        },
      );

      return rejection(
        "Unable to activate verified membership.",
        `APPLE_ENTITLEMENT_AUTHORITY_FAILED:${
          authorityError.code ?? "UNKNOWN"
        }`,
      );
    }

    return json({
      verified: true,
      entitlementStatus,
      currentPeriodEndsAt:
        expiresAt,
      productId:
        verified.productId,
      environment:
        verified.environment,
      error:
        entitlementStatus === "active"
          ? undefined
          : `Verified Apple membership is ${entitlementStatus}.`,
    });
  } catch (error) {
    console.error(
      "apple-subscription-verify failure",
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error),
    );

    return rejection(
      error instanceof Error
        ? error.message
        : "Unknown verification failure",
      "APPLE_VERIFICATION_FAILED",
    );
  }
});
