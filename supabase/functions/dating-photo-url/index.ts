import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const bucket = "profile-media";
const expiresIn = 60 * 10;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Server configuration is incomplete.");
    }

    const authorization = request.headers.get("Authorization") ?? "";

    if (!authorization.startsWith("Bearer ")) {
      return Response.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    const body = await request.json();
    const targetMemberId =
      typeof body?.targetMemberId === "string"
        ? body.targetMemberId.trim()
        : "";

    if (!targetMemberId) {
      return Response.json(
        { error: "Target member is required." },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    const { data: allowed, error: allowedError } = await userClient.rpc(
      "can_view_dating_media",
      {
        p_target_member_id: targetMemberId,
      },
    );

    if (allowedError) {
      throw allowedError;
    }

    if (allowed !== true) {
      return Response.json(
        { error: "Dating media is not available." },
        {
          status: 403,
          headers: corsHeaders,
        },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: photos, error: photoError } = await adminClient
      .from("profile_photos")
      .select("storage_path, position")
      .eq("member_id", targetMemberId)
      .eq("moderation_status", "approved")
      .order("position", {
        ascending: true,
      })
      .limit(1);

    if (photoError) {
      throw photoError;
    }

    const storagePath = photos?.[0]?.storage_path;

    if (typeof storagePath !== "string" || !storagePath.trim()) {
      return Response.json(
        { url: null },
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    }

    const { data: signed, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (signedError) {
      throw signedError;
    }

    return Response.json(
      {
        url: signed.signedUrl,
        expiresIn,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load dating media.",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
