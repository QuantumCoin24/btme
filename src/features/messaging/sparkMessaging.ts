import { isSupabaseConfigured, supabase } from "../../lib/supabase";

export type SparkMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
  isMine: boolean;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "BTME messaging is not available because Supabase is not configured.",
    );
  }

  return supabase;
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getAuthenticatedMemberId() {
  const client = requireSupabase();

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("You must be signed in to use Spark.");
  }

  return user.id;
}

export async function loadSparkMessages(
  conversationId: string,
): Promise<SparkMessage[]> {
  const cleanConversationId = conversationId.trim();

  if (!cleanConversationId) {
    return [];
  }

  const client = requireSupabase();
  const memberId = await getAuthenticatedMemberId();

  const { data, error } = await client
    .from("messages")
    .select(
      "id, conversation_id, sender_id, body, created_at, edited_at, deleted_at",
    )
    .eq("conversation_id", cleanConversationId)
    .is("deleted_at", null)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageRow[]).map((row): SparkMessage => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    createdAtLabel: formatMessageTime(row.created_at),
    isMine: row.sender_id === memberId,
  }));
}

export async function sendSparkMessage(
  conversationId: string,
  body: string,
): Promise<SparkMessage> {
  const cleanConversationId = conversationId.trim();
  const cleanBody = body.trim();

  if (!cleanConversationId) {
    throw new Error("This Spark conversation is not available.");
  }

  if (!cleanBody) {
    throw new Error("Write a message before sending.");
  }

  if (cleanBody.length > 4000) {
    throw new Error("Spark messages can be up to 4,000 characters.");
  }

  const client = requireSupabase();
  const memberId = await getAuthenticatedMemberId();

  const { data, error } = await client
    .from("messages")
    .insert({
      conversation_id: cleanConversationId,
      sender_id: memberId,
      body: cleanBody,
    })
    .select(
      "id, conversation_id, sender_id, body, created_at, edited_at, deleted_at",
    )
    .single();

  if (error) {
    throw error;
  }

  const row = data as MessageRow;

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    createdAtLabel: formatMessageTime(row.created_at),
    isMine: true,
  };
}

export function subscribeToSparkMessages(
  conversationId: string,
  onMessage: (message: SparkMessage) => void,
  onError?: (message: string) => void,
) {
  const cleanConversationId = conversationId.trim();

  if (!isSupabaseConfigured || !cleanConversationId) {
    return () => undefined;
  }

  let active = true;
  let memberId: string | null = null;

  void getAuthenticatedMemberId()
    .then((id) => {
      memberId = id;
    })
    .catch((error) => {
      if (active && onError) {
        onError(
          error instanceof Error
            ? error.message
            : "Unable to start realtime Spark.",
        );
      }
    });

  const channel = supabase
    .channel(`spark:${cleanConversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${cleanConversationId}`,
      },
      (payload) => {
        if (!active) {
          return;
        }

        const row = payload.new as MessageRow;

        if (
          !row ||
          typeof row.id !== "string" ||
          typeof row.body !== "string" ||
          row.deleted_at
        ) {
          return;
        }

        onMessage({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
          createdAtLabel: formatMessageTime(row.created_at),
          isMine: Boolean(memberId && row.sender_id === memberId),
        });
      },
    )
    .subscribe((status) => {
      if (active && status === "CHANNEL_ERROR" && onError) {
        onError("Realtime Spark connection was interrupted.");
      }
    });

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}
