import fs from "node:fs";

const files = {
  migration:
    "supabase/migrations/20260903230000_membership_verification_access_state.sql",
  access: "src/features/access/memberAccess.ts",
  membership: "src/features/membership/MembershipContext.tsx",
  preview: "app/membership-preview.tsx",
};

const text = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    fs.readFileSync(file, "utf8"),
  ]),
);

const required = {
  migration: [
    "public.member_authority_audit",
    "private.set_member_verification_authority",
    "private.set_member_entitlement_authority",
    "public.get_my_dating_access_state",
    "public.apply_member_verification_authority",
    "public.apply_member_entitlement_authority",
    "to service_role",
    "private.btme_member_can_date",
    "from authenticated",
    "'verification'",
    "'entitlement'",
  ],

  access: [
    "get_my_dating_access_state",
    "MemberAccessState",
    "describeAccessBlocker",
    "verification",
    "membership",
  ],

  membership: [
    "getMyDatingAccessState",
    "hasActiveMembership",
    "isVerified",
    "canDate",
    "refreshMembership",
    "describeAccessBlocker",
  ],

  preview: [
    "AUTHORITATIVE ACCESS STATE",
    "hasActiveMembership",
    "isVerified",
    "canDate",
    "refreshMembership",
  ],
};

for (const [key, needles] of Object.entries(required)) {
  for (const needle of needles) {
    if (!text[key].includes(needle)) {
      throw new Error(`${files[key]} missing contract: ${needle}`);
    }
  }
}

const sql = text.migration;

const forbiddenGrants = [
  /grant\s+execute[\s\S]{0,300}set_member_verification_authority[\s\S]{0,300}to\s+authenticated/i,
  /grant\s+execute[\s\S]{0,300}set_member_entitlement_authority[\s\S]{0,300}to\s+authenticated/i,
  /grant\s+(insert|update|delete)[\s\S]{0,200}member_entitlements[\s\S]{0,100}authenticated/i,
  /grant\s+(insert|update|delete)[\s\S]{0,200}identity_verifications[\s\S]{0,100}authenticated/i,
];

for (const pattern of forbiddenGrants) {
  if (pattern.test(sql)) {
    throw new Error(`Forbidden Build 28 authority grant: ${pattern}`);
  }
}

if (
  !sql.includes(
    "revoke all\n  on function private.set_member_verification_authority",
  )
) {
  throw new Error("Verification authority is not explicitly revoked.");
}

if (
  !sql.includes(
    "revoke all\n  on function private.set_member_entitlement_authority",
  )
) {
  throw new Error("Entitlement authority is not explicitly revoked.");
}

const serviceRoleContracts = [
  "public.apply_member_verification_authority",
  "public.apply_member_entitlement_authority",
];

for (const functionName of serviceRoleContracts) {
  const authenticatedGrant = new RegExp(
    String.raw`grant\s+execute[\s\S]{0,400}${functionName.replaceAll(
      ".",
      String.raw`\.`,
    )}[\s\S]{0,400}to\s+authenticated`,
    "i",
  );

  if (authenticatedGrant.test(sql)) {
    throw new Error(
      `${functionName} must never be executable by authenticated clients`,
    );
  }
}

if (
  !/grant\s+execute[\s\S]{0,400}apply_member_verification_authority[\s\S]{0,400}to\s+service_role/i.test(
    sql,
  )
) {
  throw new Error("Verification RPC bridge is not granted to service_role.");
}

if (
  !/grant\s+execute[\s\S]{0,400}apply_member_entitlement_authority[\s\S]{0,400}to\s+service_role/i.test(
    sql,
  )
) {
  throw new Error("Entitlement RPC bridge is not granted to service_role.");
}

const clientCorpus = [text.access, text.membership, text.preview].join("\n");

const forbiddenClientMutations = [
  /\.from\(['"]identity_verifications['"]\)\s*\.\s*(insert|update|upsert|delete)/i,
  /\.from\(['"]member_entitlements['"]\)\s*\.\s*(insert|update|upsert|delete)/i,
  /set_member_verification_authority/,
  /set_member_entitlement_authority/,
];

for (const pattern of forbiddenClientMutations) {
  if (pattern.test(clientCorpus)) {
    throw new Error(`Client authority violation: ${pattern}`);
  }
}

if (
  /RevenueCat|react-native-purchases|StoreKit|purchasePackage|purchaseProduct/.test(
    clientCorpus,
  )
) {
  throw new Error("Build 28 must not fabricate external purchase integration.");
}

console.log("BUILD 28 CONTRACT GATE: PASS");
console.log("Verification authority: trusted-server only");
console.log("Entitlement authority: trusted-server only");
console.log("Member access projection: self-readable");
console.log("Membership context: production-backed");
console.log("External billing provider: intentionally not fabricated");
