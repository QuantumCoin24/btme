import fs from "node:fs";

const contracts = [
  {
    file:
      "supabase/migrations/" +
      "20260903220000_production_access_media_realtime.sql",
    required: [
      "public.member_entitlements",
      "private.btme_member_is_verified",
      "private.btme_member_has_active_entitlement",
      "private.btme_member_can_date",
      "get_my_membership_entitlement",
      "can_view_dating_media",
      "candidate_preferences.relationship_intent",
      "d.actor_id = v_member_id",
      "d.target_id = candidate.id",
      "record_member_decision_unchecked",
      "supabase_realtime",
      "public.messages",
    ],
  },
  {
    file: "supabase/functions/dating-photo-url/index.ts",
    required: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "auth.getUser",
      "can_view_dating_media",
      "moderation_status",
      "approved",
      "profile_photos",
      "createSignedUrl",
      "profile-media",
    ],
  },
  {
    file: "src/features/discovery/datingMedia.ts",
    required: ["supabase.functions.invoke", "dating-photo-url"],
  },
  {
    file: "src/features/discovery/DiscoveryContext.tsx",
    required: [
      "getDatingPhotoUrl",
      "photoUrl?: string | null",
      "hydratedProfiles",
    ],
  },
  {
    file: "app/(main)/discover.tsx",
    required: ["currentProfile.photoUrl", "styles.discoveryPhoto"],
  },
  {
    file: "src/features/messaging/sparkMessaging.ts",
    required: [
      "subscribeToSparkMessages",
      "postgres_changes",
      'table: "messages"',
      "conversationId: row.conversation_id",
      "senderId: row.sender_id",
      "createdAt: row.created_at",
      "removeChannel",
    ],
  },
  {
    file: "app/(main)/spark/[connectionId].tsx",
    required: ["subscribeToSparkMessages", "Date plan saved."],
  },
];

let failed = false;

for (const contract of contracts) {
  const { file, required } = contract;

  if (!fs.existsSync(file)) {
    console.error(`FAIL: missing ${file}`);
    failed = true;
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  for (const needle of required) {
    if (!text.includes(needle)) {
      console.error(`FAIL: ${file} missing "${needle}"`);
      failed = true;
    }
  }
}

const migrationFile =
  "supabase/migrations/" +
  "20260903220000_production_access_media_realtime.sql";

const migration = fs.readFileSync(migrationFile, "utf8").toLowerCase();

const forbiddenSql = [
  "d.member_id = v_member_id",
  "d.target_member_id = candidate.id",
  "cmp.relationship_intent",
  "grant insert on table public.member_entitlements to authenticated",
  "grant update on table public.member_entitlements to authenticated",
  "grant delete on table public.member_entitlements to authenticated",
  "update public.identity_verifications set status = 'verified'",
  "insert into public.identity_verifications",
  "alter table storage.objects disable row level security",
  "update storage.buckets set public = true",
];

for (const needle of forbiddenSql) {
  if (migration.includes(needle)) {
    console.error(`FAIL: forbidden or invalid SQL: ${needle}`);
    failed = true;
  }
}

const edge = fs.readFileSync(
  "supabase/functions/dating-photo-url/index.ts",
  "utf8",
);

const authorization = edge.indexOf("can_view_dating_media");

const signing = edge.indexOf("createSignedUrl");

if (authorization < 0 || signing < 0 || authorization > signing) {
  console.error("FAIL: media authorization must occur before signing.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("Build 27 contract gate: PASS");
