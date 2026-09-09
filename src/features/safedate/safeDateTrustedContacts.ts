import { supabase } from "../../lib/supabase";
import { getSafeDateInstallationRpcArgs } from "./safeDateInstallation";

export type SafeDateTrustedContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  linked: boolean;
  linkedAt: string | null;
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

  const contacts =
    ((data ?? []) as TrustedContactRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      createdAt: row.created_at,
      linked: false,
      linkedAt: null as string | null,
    }));

  return Promise.all(
    contacts.map(async (contact) => {
      const state =
        await getMySafeDateTrustedContactLinkState(
          contact.id,
        );

      return {
        ...contact,
        linked: state.linked,
        linkedAt: state.linkedAt,
      };
    }),
  );
}

export async function addMySafeDateTrustedContact(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
}): Promise<string> {
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { data, error } = await supabase.rpc(
    "add_my_safe_date_trusted_contact",
    {
      p_name: input.name,
      p_phone: input.phone ?? null,
      p_email: input.email ?? null,
      ...installation,
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
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { error } = await supabase.rpc(
    "revoke_my_safe_date_trusted_contact",
    {
      p_trusted_contact_id: trustedContactId,
      ...installation,
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
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { error } = await supabase.rpc(
    "set_my_safe_date_trusted_contact_enabled",
    {
      p_date_plan_id: datePlanId,
      p_trusted_contact_id: trustedContactId,
      p_enabled: enabled,
      ...installation,
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

export async function createMySafeDateTrustedContactInvite(
  trustedContactId: string,
): Promise<string> {
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { data, error } = await supabase.rpc(
    "create_my_safe_date_trusted_contact_invite",
    {
      p_trusted_contact_id: trustedContactId,
      ...installation,
    },
  );

  if (error) {
    throw new Error(
      messageFor(
        error,
        "Unable to create trusted contact invite.",
      ),
    );
  }

  if (typeof data !== "string" || !data) {
    throw new Error(
      "Trusted contact invite was not created.",
    );
  }

  return data;
}

export async function acceptSafeDateTrustedContactInvite(
  token: string,
): Promise<void> {
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { error } = await supabase.rpc(
    "accept_safe_date_trusted_contact_invite",
    {
      p_token: token,
      ...installation,
    },
  );

  if (error) {
    throw new Error(
      messageFor(
        error,
        "Unable to accept trusted contact invite.",
      ),
    );
  }
}

export async function getMySafeDateTrustedContactLinkState(
  trustedContactId: string,
): Promise<{
  linked: boolean;
  linkedAt: string | null;
}> {
  const { data, error } = await supabase.rpc(
    "get_my_safe_date_trusted_contact_link_state",
    {
      p_trusted_contact_id: trustedContactId,
    },
  );

  if (error) {
    throw new Error(
      messageFor(
        error,
        "Unable to load trusted contact link state.",
      ),
    );
  }

  const row = Array.isArray(data)
    ? data[0]
    : null;

  return {
    linked: Boolean(row?.linked),
    linkedAt:
      typeof row?.linked_at === "string"
        ? row.linked_at
        : null,
  };
}
