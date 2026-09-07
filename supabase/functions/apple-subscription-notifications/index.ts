import {
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";

import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const APPLE_ROOT_CA_1 =
  Deno.env.get("APPLE_ROOT_CA_1");

const APPLE_ROOT_CA_2 =
  Deno.env.get("APPLE_ROOT_CA_2");

const APPLE_ROOT_CA_3 =
  Deno.env.get("APPLE_ROOT_CA_3");

const EXPECTED_BUNDLE_ID =
  "uk.betterthanmyex.app";

const EXPECTED_APP_APPLE_ID =
  6808386431;

const ALLOWED_PRODUCT_IDS = new Set([
  "uk.betterthanmyex.app.premium.monthly",
  "uk.betterthanmyex.app.premium.sixmonth",
  "uk.betterthanmyex.app.premium.annual",
]);

type AppleEnvironment =
  | "Production"
  | "Sandbox";

type EntitlementStatus =
  | "active"
  | "grace_period"
  | "expired"
  | "revoked";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function requireConfiguration() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase server configuration is incomplete.",
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

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Verified Apple payload is missing ${field}.`,
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
      `Verified Apple payload is missing ${field}.`,
    );
  }

  return value;
}

function requireUuid(
  value: unknown,
  field: string,
): string {
  const normalized =
    requireString(value, field).toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `Verified Apple payload contains invalid ${field}.`,
    );
  }

  return normalized;
}

function environmentName(
  environment: Environment,
): AppleEnvironment {
  return environment === Environment.PRODUCTION
    ? "Production"
    : "Sandbox";
}

function createVerifier(
  environment: Environment,
) {
  return new SignedDataVerifier(
    appleRoots(),
    true,
    environment,
    EXPECTED_BUNDLE_ID,
    environment === Environment.PRODUCTION
      ? EXPECTED_APP_APPLE_ID
      : undefined,
  );
}

async function verifyNotificationAcrossEnvironments(
  signedPayload: string,
) {
  try {
    const environment =
      Environment.PRODUCTION;

    const verifier =
      createVerifier(environment);

    const decoded =
      await verifier.verifyAndDecodeNotification(
        signedPayload,
      );

    return {
      environment,
      verifier,
      decoded,
    };
  } catch (productionError) {
    try {
      const environment =
        Environment.SANDBOX;

      const verifier =
        createVerifier(environment);

      const decoded =
        await verifier.verifyAndDecodeNotification(
          signedPayload,
        );

      return {
        environment,
        verifier,
        decoded,
      };
    } catch {
      throw productionError;
    }
  }
}

function deriveEntitlementStatus({
  notificationType,
  expiresDate,
  revocationDate,
  gracePeriodExpiresDate,
  isInBillingRetryPeriod,
  subscriptionStatus,
}: {
  notificationType: string;
  expiresDate: number;
  revocationDate: number | null;
  gracePeriodExpiresDate: number | null;
  isInBillingRetryPeriod: boolean;
  subscriptionStatus: number | null;
}): EntitlementStatus {
  const now = Date.now();

  /*
   * Explicit Apple revocation events are authoritative.
   */
  if (
    notificationType === "REFUND" ||
    notificationType === "REVOKE"
  ) {
    return "revoked";
  }

  /*
   * Verified Apple subscription status is primary
   * lifecycle authority whenever Apple supplies it.
   *
   * 1 = ACTIVE
   * 2 = EXPIRED
   * 3 = BILLING_RETRY
   * 4 = BILLING_GRACE_PERIOD
   * 5 = REVOKED
   */
  switch (subscriptionStatus) {
    case 5:
      return "revoked";

    case 2:
      return "expired";

    case 4:
      /*
       * A verified grace status still requires a
       * future verified grace-period expiry.
       *
       * isInBillingRetryPeriod is optional renewal
       * metadata, so its absence cannot by itself
       * destroy an explicit Apple grace state.
       */
      if (
        typeof gracePeriodExpiresDate === "number" &&
        gracePeriodExpiresDate > now
      ) {
        return "grace_period";
      }

      return "expired";

    case 3:
      /*
       * Billing retry is not billing grace.
       * Existing paid entitlement survives only until
       * the verified transaction expiry.
       */
      return expiresDate > now
        ? "active"
        : "expired";

    case 1:
      return expiresDate > now
        ? "active"
        : "expired";
  }

  /*
   * data.status is optional in the V2 structure.
   * With no status, fall back conservatively to the
   * verified notification and transaction evidence.
   *
   * REFUND_REVERSED deliberately bypasses a historical
   * transaction revocation date because Apple has
   * explicitly reversed that refund event.
   */
  if (
    notificationType !== "REFUND_REVERSED" &&
    typeof revocationDate === "number" &&
    revocationDate > 0
  ) {
    return "revoked";
  }

  if (
    notificationType === "GRACE_PERIOD_EXPIRED" ||
    notificationType === "EXPIRED"
  ) {
    return "expired";
  }

  if (
    isInBillingRetryPeriod &&
    typeof gracePeriodExpiresDate === "number" &&
    gracePeriodExpiresDate > now
  ) {
    return "grace_period";
  }

  if (expiresDate > now) {
    return "active";
  }

  return "expired";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    requireConfiguration();

    const body =
      await request.json().catch(() => null);

    const signedPayload =
      typeof body?.signedPayload === "string"
        ? body.signedPayload.trim()
        : "";

    if (!signedPayload) {
      return json(
        {
          error:
            "Apple signed payload is required.",
        },
        400,
      );
    }

    /*
     * Apple is the caller.
     *
     * This endpoint deliberately does not use
     * Supabase user authentication. Authority
     * begins only after Apple's JWS has been
     * cryptographically verified.
     */

    const {
      environment,
      verifier,
      decoded: notification,
    } =
      await verifyNotificationAcrossEnvironments(
        signedPayload,
      );

    const notificationType =
      requireString(
        notification.notificationType,
        "notificationType",
      );

    const notificationUUID =
      requireUuid(
        notification.notificationUUID,
        "notificationUUID",
      );

    const notificationSignedDate =
      requireNumber(
        notification.signedDate,
        "signedDate",
      );

    const subtype =
      typeof notification.subtype === "string"
        ? notification.subtype.trim()
        : "";

    const data = notification.data;

    if (!data) {
      /*
       * BTME only processes subscription lifecycle
       * notifications carrying Apple's transaction
       * data object.
       *
       * Other valid V2 notification shapes are
       * acknowledged but cannot mutate membership.
       */
      return json({
        received: true,
        processed: false,
        reason:
          "notification_without_subscription_data",
      });
    }

    const expectedEnvironment =
      environmentName(environment);

    const dataEnvironment =
      requireString(
        data.environment,
        "data.environment",
      );

    if (
      dataEnvironment !== expectedEnvironment
    ) {
      throw new Error(
        "Apple notification environment mismatch.",
      );
    }

    if (!data.signedTransactionInfo) {
      throw new Error(
        "Apple notification is missing signed transaction information.",
      );
    }

    const transaction =
      await verifier.verifyAndDecodeTransaction(
        data.signedTransactionInfo,
      );

    const transactionId =
      requireString(
        transaction.transactionId,
        "transactionId",
      );

    const originalTransactionId =
      requireString(
        transaction.originalTransactionId,
        "originalTransactionId",
      );

    const productId =
      requireString(
        transaction.productId,
        "productId",
      );

    const bundleId =
      requireString(
        transaction.bundleId,
        "bundleId",
      );

    const transactionEnvironment =
      requireString(
        transaction.environment,
        "transaction.environment",
      );

    const appAccountToken =
      requireUuid(
        transaction.appAccountToken,
        "appAccountToken",
      );

    const purchaseDate =
      requireNumber(
        transaction.purchaseDate,
        "purchaseDate",
      );

    const transactionSignedDate =
      requireNumber(
        transaction.signedDate,
        "transaction.signedDate",
      );

    const expiresDate =
      requireNumber(
        transaction.expiresDate,
        "expiresDate",
      );

    if (
      bundleId !== EXPECTED_BUNDLE_ID
    ) {
      throw new Error(
        "Apple bundle identifier mismatch.",
      );
    }

    if (
      transactionEnvironment !==
      expectedEnvironment
    ) {
      throw new Error(
        "Apple transaction environment mismatch.",
      );
    }

    if (
      !ALLOWED_PRODUCT_IDS.has(productId)
    ) {
      throw new Error(
        "Unsupported Apple membership product.",
      );
    }

    let gracePeriodExpiresDate:
      | number
      | null = null;


    let isInBillingRetryPeriod = false;

    const subscriptionStatus =
      typeof data.status === "number" &&
        Number.isFinite(data.status)
        ? data.status
        : null;

    if (
      subscriptionStatus !== null &&
      ![1, 2, 3, 4, 5].includes(
        subscriptionStatus,
      )
    ) {
      throw new Error(
        "Unsupported Apple subscription status.",
      );
    }

if (data.signedRenewalInfo) {
      const renewal =
        await verifier.verifyAndDecodeRenewalInfo(
          data.signedRenewalInfo,
        );

      const renewalEnvironment =
        requireString(
          renewal.environment,
          "renewal.environment",
        );

      if (
        renewalEnvironment !==
        expectedEnvironment
      ) {
        throw new Error(
          "Apple renewal environment mismatch.",
        );
      }

      const renewalOriginalTransactionId =
        requireString(
          renewal.originalTransactionId,
          "renewal.originalTransactionId",
        );

      if (
        renewalOriginalTransactionId !==
        originalTransactionId
      ) {
        throw new Error(
          "Apple renewal transaction mismatch.",
        );
      }

      if (
        typeof renewal.productId === "string" &&
        renewal.productId.trim() &&
        renewal.productId.trim() !== productId
      ) {
        throw new Error(
          "Apple renewal product mismatch.",
        );
      }

      if (
        typeof renewal.appAccountToken ===
          "string" &&
        renewal.appAccountToken.trim() &&
        requireUuid(
          renewal.appAccountToken,
          "renewal.appAccountToken",
        ) !== appAccountToken
      ) {
        throw new Error(
          "Apple renewal account token mismatch.",
        );
      }

      if (
        typeof renewal.gracePeriodExpiresDate ===
          "number" &&
        Number.isFinite(
          renewal.gracePeriodExpiresDate,
        )
      ) {
        gracePeriodExpiresDate =
          renewal.gracePeriodExpiresDate;
      }


      isInBillingRetryPeriod =
        renewal.isInBillingRetryPeriod === true;
    }

    const revocationDate =
      typeof transaction.revocationDate ===
          "number" &&
        Number.isFinite(
          transaction.revocationDate,
        )
        ? transaction.revocationDate
        : null;

    const entitlementStatus =
      deriveEntitlementStatus({
        notificationType,
        expiresDate,
        revocationDate,
        gracePeriodExpiresDate,
        isInBillingRetryPeriod,
        subscriptionStatus,
      });

    const serviceClient =
      createClient(
        SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const {
      data: authorityResult,
      error: authorityError,
    } =
      await serviceClient.rpc(
        "apply_verified_apple_lifecycle_notification",
        {
          p_notification_uuid:
            notificationUUID,
          p_notification_type:
            notificationType,
          p_notification_subtype:
            subtype || null,
          p_environment:
            expectedEnvironment,
          p_original_transaction_id:
            originalTransactionId,
          p_latest_transaction_id:
            transactionId,
          p_product_id:
            productId,
          p_app_account_token:
            appAccountToken,
          p_entitlement_status:
            entitlementStatus,
          p_purchase_date:
            new Date(
              purchaseDate,
            ).toISOString(),
          /*
           * Subscription authority chronology follows
           * Apple's signed transaction chronology.
           *
           * The notification signed date remains
           * independently verified above and is used
           * for notification-level validation.
           */
            p_transaction_signed_date:
              new Date(
                transactionSignedDate,
              ).toISOString(),
            p_notification_signed_date:
              new Date(
                notificationSignedDate,
              ).toISOString(),
          p_expires_at:
            new Date(
              expiresDate,
            ).toISOString(),
          p_revocation_date:
            revocationDate
              ? new Date(
                  revocationDate,
                ).toISOString()
              : null,
        },
      );

    if (authorityError) {
      console.error(
        "Apple lifecycle authority rejected verified notification",
        {
          notificationUUID,
          notificationType,
          transactionId,
          code: authorityError.code,
        },
      );

      return json(
        {
          error:
            "Unable to apply Apple subscription lifecycle.",
          code:
            "APPLE_LIFECYCLE_AUTHORITY_FAILED",
        },
        503,
      );
    }

    /*
     * Never persist or return signedPayload,
     * signedTransactionInfo or signedRenewalInfo.
     */

    return json({
      received: true,
      processed:
        authorityResult === "processed",
      duplicate:
        authorityResult === "duplicate",
      stale:
        authorityResult === "stale",
      entitlementStatus,
    });
  } catch (error) {
    /*
     * Do not return Apple JWS material,
     * trust anchors, service-role credentials
     * or raw verification exceptions.
     */

    console.error(
      "apple-subscription-notifications failure",
      {
        category:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );

    return json(
      {
        error:
          "Unable to verify Apple subscription notification.",
        code:
          "APPLE_NOTIFICATION_VERIFICATION_FAILED",
      },
      400,
    );
  }
});
