import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY");

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

function finiteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

type EvidenceStep = {
  step:
    | "neutral"
    | "turn_left"
    | "turn_right";
  faceCount: number;
  captureQuality: number;
  yaw: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

function parseStep(
  value: unknown,
): EvidenceStep {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Invalid live selfie evidence.",
    );
  }

  const input =
    value as Record<string, unknown>;

  const step = input.step;

  if (
    step !== "neutral" &&
    step !== "turn_left" &&
    step !== "turn_right"
  ) {
    throw new Error(
      "Invalid live selfie evidence.",
    );
  }

  const numericFields = [
    input.faceCount,
    input.captureQuality,
    input.yaw,
    input.width,
    input.height,
    input.centerX,
    input.centerY,
  ];

  if (!numericFields.every(finiteNumber)) {
    throw new Error(
      "Invalid live selfie evidence.",
    );
  }

  return {
    step,
    faceCount: input.faceCount as number,
    captureQuality:
      input.captureQuality as number,
    yaw: input.yaw as number,
    width: input.width as number,
    height: input.height as number,
    centerX: input.centerX as number,
    centerY: input.centerY as number,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      },
    );
  }

  if (request.method !== "POST") {
    return json(
      {
        error: "Method not allowed.",
      },
      405,
    );
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return json(
      {
        error:
          "Server configuration is incomplete.",
      },
      500,
    );
  }

  const authorization =
    request.headers.get("Authorization");

  if (!authorization) {
    return json(
      {
        error: "Authentication required.",
      },
      401,
    );
  }

  const userClient =
    createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  const serviceClient =
    createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

  try {
    const {
      data: userData,
      error: userError,
    } = await userClient.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      return json(
        {
          error: "Authentication required.",
        },
        401,
      );
    }

    const body =
      await request.json() as {
        challengeId?: unknown;
        challengeVersion?: unknown;
        steps?: unknown;
      };

    if (
      typeof body.challengeId !== "string" ||
      !body.challengeId.trim()
    ) {
      return json(
        {
          error: "Challenge ID is required.",
        },
        400,
      );
    }

    if (
      body.challengeVersion !== "v1"
    ) {
      return json(
        {
          error:
            "Unsupported challenge version.",
        },
        400,
      );
    }

    if (
      !Array.isArray(body.steps) ||
      body.steps.length < 3 ||
      body.steps.length > 5
    ) {
      return json(
        {
          error:
            "Challenge evidence is incomplete.",
        },
        400,
      );
    }

    const steps =
      body.steps.map(parseStep);

    const {
      error: completionError,
    } = await serviceClient.rpc(
      "complete_live_selfie_challenge_authority",
      {
        p_member_id:
          userData.user.id,
        p_challenge_id:
          body.challengeId.trim(),
        p_challenge_version:
          body.challengeVersion,
        p_result_summary: {
          version: "v1",
          steps,
        },
      },
    );

    if (completionError) {
      console.warn(
        "[BTME] Live selfie authority rejected completion:",
        completionError.message,
      );

      return json(
        {
          verified: false,
          error:
            "Live selfie verification was not completed.",
        },
        422,
      );
    }

    return json({
      verified: true,
      method: "btme_live_selfie",
    });
  } catch (error) {
    console.error(
      "[BTME] Live selfie verification failed:",
      error,
    );

    return json(
      {
        verified: false,
        error:
          "Live selfie verification failed.",
      },
      400,
    );
  }
});
