import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
} from "@supabase/supabase-js";

const EXPO_SEND =
  "https://exp.host/--/api/v2/push/send";

const EXPO_RECEIPTS =
  "https://exp.host/--/api/v2/push/getReceipts";

type Delivery = {
  delivery_id: string;
  outbox_id: string;
  push_device_id: string;
  expo_push_token: string;
  notification_type:
    | "check_in_missed"
    | "assistance_requested"
    | "escalation_recovered";
};

type ReceiptCandidate = {
  delivery_id: string;
  push_device_id: string;
  provider_ticket_id: string;
};

function bodyFor(
  type: Delivery["notification_type"],
): string {
  switch (type) {
    case "assistance_requested":
      return (
        "Your BTME SafeDate contact " +
        "requested assistance. Please " +
        "contact them directly. BTME does " +
        "not contact emergency services."
      );

    case "check_in_missed":
      return (
        "Your BTME SafeDate contact missed " +
        "a scheduled check-in. Please " +
        "contact them directly."
      );

    case "escalation_recovered":
      return (
        "Your BTME SafeDate contact has " +
        "checked in or cleared their " +
        "SafeDate alert."
      );
  }
}

function safeError(
  value: unknown,
): string {
  if (
    typeof value === "string" &&
    value.length > 0
  ) {
    return value.slice(
      0,
      400,
    );
  }

  return "push_provider_error";
}

const url =
  Deno.env.get("SUPABASE_URL");

const legacyServiceKey =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

const secretKeysRaw =
  Deno.env.get(
    "SUPABASE_SECRET_KEYS",
  );

let adminKey =
  legacyServiceKey ?? null;

if (
  !adminKey &&
  secretKeysRaw
) {
  try {
    const parsed =
      JSON.parse(
        secretKeysRaw,
      ) as Record<
        string,
        string
      >;

    adminKey =
      parsed.default ?? null;
  } catch {
    adminKey = null;
  }
}

if (!url || !adminKey) {
  throw new Error(
    "SafeDate worker configuration missing.",
  );
}

const supabase =
  createClient(
    url,
    adminKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      {
        error:
          "method_not_allowed",
      },
      {
        status: 405,
      },
    );
  }

  let ticketed = 0;
  let receipts = 0;
  let failed = 0;

  const {
    data: claimed,
    error: claimError,
  } = await supabase.rpc(
    "claim_safe_date_push_deliveries",
    {
      p_limit: 50,
    },
  );

  if (claimError) {
    return Response.json(
      {
        error:
          "claim_failed",
      },
      {
        status: 500,
      },
    );
  }

  for (
    const item
    of (
      claimed ?? []
    ) as Delivery[]
  ) {
    try {
      const response =
        await fetch(
          EXPO_SEND,
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                to:
                  item.expo_push_token,

                title:
                  "BTME™ SafeDate™",

                body:
                  bodyFor(
                    item.notification_type,
                  ),

                sound:
                  "default",

                priority:
                  "high",

                data: {
                  type:
                    "safedate_alert",

                  kind:
                    item.notification_type,
                },
              }),
          },
        );

      if (
        response.status === 429 ||
        response.status >= 500
      ) {
        await supabase.rpc(
          "retry_safe_date_push_delivery",
          {
            p_delivery_id:
              item.delivery_id,

            p_error:
              `expo_http_${response.status}`,
          },
        );

        failed += 1;

        continue;
      }

      if (!response.ok) {
        await supabase.rpc(
          "complete_safe_date_push_receipt",
          {
            p_delivery_id:
              item.delivery_id,

            p_status:
              "failed",

            p_error:
              `expo_http_${response.status}`,
          },
        );

        failed += 1;

        continue;
      }

      const payload =
        await response.json();

      const ticket =
        Array.isArray(
          payload?.data,
        )
          ? payload.data[0]
          : payload?.data;

      if (
        ticket?.status ===
          "ok" &&
        typeof ticket?.id ===
          "string"
      ) {
        const {
          error:
            ticketSaveError,
        } =
          await supabase.rpc(
            "mark_safe_date_push_ticket",
            {
              p_delivery_id:
                item.delivery_id,

              p_ticket_id:
                ticket.id,
            },
          );

        if (
          ticketSaveError
        ) {
          throw ticketSaveError;
        }

        ticketed += 1;

        continue;
      }

      const code =
        ticket?.details
          ?.error;

      if (
        code ===
        "DeviceNotRegistered"
      ) {
        await supabase.rpc(
          "complete_safe_date_push_receipt",
          {
            p_delivery_id:
              item.delivery_id,

            p_status:
              "device_not_registered",

            p_error:
              "DeviceNotRegistered",
          },
        );

        failed += 1;

        continue;
      }

      await supabase.rpc(
        "complete_safe_date_push_receipt",
        {
          p_delivery_id:
            item.delivery_id,

          p_status:
            "failed",

          p_error:
            safeError(
              code,
            ),
        },
      );

      failed += 1;
    } catch {
      await supabase.rpc(
        "retry_safe_date_push_delivery",
        {
          p_delivery_id:
            item.delivery_id,

          p_error:
            "expo_network_error",
        },
      );

      failed += 1;
    }
  }

  const {
    data:
      receiptCandidates,

    error:
      receiptLoadError,
  } =
    await supabase.rpc(
      "get_safe_date_push_receipts",
      {
        p_limit: 100,
      },
    );

  if (
    !receiptLoadError &&
    receiptCandidates?.length
  ) {
    const rows: ReceiptCandidate[] =
      receiptCandidates ?? [];

    try {
      const response =
        await fetch(
          EXPO_RECEIPTS,
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ids:
                  rows.map(
                    (
                      row,
                    ) =>
                      row.provider_ticket_id,
                  ),
              }),
          },
        );

      if (response.ok) {
        const payload =
          await response.json();

        const result =
          payload?.data ??
          {};

        for (
          const row
          of rows
        ) {
          const receipt =
            result[
              row.provider_ticket_id
            ];

          if (!receipt) {
            continue;
          }

          if (
            receipt.status ===
            "ok"
          ) {
            await supabase.rpc(
              "complete_safe_date_push_receipt",
              {
                p_delivery_id:
                  row.delivery_id,

                p_status:
                  "delivered",

                p_error:
                  null,
              },
            );

            receipts += 1;

            continue;
          }

          const code =
            receipt?.details
              ?.error;

          if (
            code ===
            "DeviceNotRegistered"
          ) {
            await supabase.rpc(
              "complete_safe_date_push_receipt",
              {
                p_delivery_id:
                  row.delivery_id,

                p_status:
                  "device_not_registered",

                p_error:
                  "DeviceNotRegistered",
              },
            );
          } else {
            await supabase.rpc(
              "complete_safe_date_push_receipt",
              {
                p_delivery_id:
                  row.delivery_id,

                p_status:
                  "failed",

                p_error:
                  safeError(
                    code,
                  ),
              },
            );
          }

          failed += 1;
        }
      }
    } catch {
      // Ticket remains available for
      // receipt reconciliation on the
      // next scheduled run.
    }
  }

  return Response.json({
    ok: true,
    ticketed,
    receipts,
    failed,
  });
});
