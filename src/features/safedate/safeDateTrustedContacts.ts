import { supabase } from "../../lib/supabase";

export type SafeDateTrustedContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

export type ActiveSafeDateTrustedContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  enabledAt: string;
};

type TrustedContactRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type ActiveTrustedContactRow = {
  trusted_contact_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  enabled_at: string;
};

function messageFor(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export async function getMySafeDateTrustedContacts(): Promise<
  SafeDateTrustedContact[]
> {
  const { data, error } = await supabase.rpc(
    "get_my_safe_date_trusted_contacts",
  );

  if (error) {
    throw new Error(
      messageFor(error, "Unable to load trusted contacts."),
    );
  }

  return ((data ?? []) as TrustedContactRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
  }));
}

export async function addMySafeDateTrustedContact(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc(
    "add_my_safe_date_trusted_contact",
    {
      p_name: input.name,
      p_phone: input.phone ?? null,
      p_email: input.email ?? null,
    },
  );

  if (error) {
    throw new Error(
      messageFor(error, "Unable to add trusted contact."),
    );
  }

  if (typeof data !== "string" || !data) {
    throw new Error("Trusted contact was not created.");
  }

  return data;
}

export async function revokeMySafeDateTrustedContact(
  trustedContactId: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    "revoke_my_safe_date_trusted_contact",
    {
      p_trusted_contact_id: trustedContactId,
    },
  );

  if (error) {
    throw new Error(
      messageFor(error, "Unable to remove trusted contact."),
    );
  }
}

export async function setMySafeDateTrustedContactEnabled(
  datePlanId: string,
  trustedContactId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase.rpc(
    "set_my_safe_date_trusted_contact_enabled",
    {
      p_date_plan_id: datePlanId,
      p_trusted_contact_id: trustedContactId,
      p_enabled: enabled,
    },
  );

  if (error) {
    throw new Error(
      messageFor(
        error,
        "Unable to update trusted contact protection.",
      ),
    );
  }
}

export async function getMyActiveSafeDateTrustedContacts(
  datePlanId: string,
): Promise<ActiveSafeDateTrustedContact[]> {
  const { data, error } = await supabase.rpc(
    "get_my_safe_date_active_trusted_contacts",
    {
      p_date_plan_id: datePlanId,
    },
  );

  if (error) {
    throw new Error(
      messageFor(
        error,
        "Unable to load active trusted contacts.",
      ),
    );
  }

  return ((data ?? []) as ActiveTrustedContactRow[]).map(
    (row) => ({
      id: row.trusted_contact_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      enabledAt: row.enabled_at,
    }),
  );
}
