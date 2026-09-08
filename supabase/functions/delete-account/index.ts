import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const PROFILE_MEDIA_BUCKET = "profile-media";

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

function requireConfiguration() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase server configuration is incomplete.",
    );
  }
}

async function listProfileMedia(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const paths: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } =
      await adminClient.storage
        .from(PROFILE_MEDIA_BUCKET)
        .list(userId, {
          limit,
          offset,
          sortBy: {
            column: "name",
            order: "asc",
          },
        });

    if (error) {
      throw new Error(
        `Unable to enumerate profile media: ${error.message}`,
      );
    }

    const rows = data ?? [];

    for (const row of rows) {
      if (row.name) {
        paths.push(`${userId}/${row.name}`);
      }
    }

    if (rows.length < limit) {
      break;
    }

    offset += limit;
  }

  return paths;
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
    requireConfiguration();

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

    const adminClient = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const mediaPaths =
      await listProfileMedia(
        adminClient,
        user.id,
      );

    if (mediaPaths.length > 0) {
      const { error: mediaError } =
        await adminClient.storage
          .from(PROFILE_MEDIA_BUCKET)
          .remove(mediaPaths);

      if (mediaError) {
        throw new Error(
          `Unable to remove profile media: ${mediaError.message}`,
        );
      }
    }

    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(
        user.id,
      );

    if (deleteError) {
      throw new Error(
        `Unable to delete account: ${deleteError.message}`,
      );
    }

    return json({
      deleted: true,
    });
  } catch (error) {
    console.error(
      "[BTME] Account deletion failed:",
      error,
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete account.",
      },
      500,
    );
  }
});
