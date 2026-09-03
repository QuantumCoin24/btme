import { isSupabaseConfigured, supabase } from "../../lib/supabase";

type DatingPhotoResponse = {
  url?: string | null;
  error?: string;
};

export async function getDatingPhotoUrl(
  memberId: string,
): Promise<string | null> {
  const targetMemberId = memberId.trim();

  if (!isSupabaseConfigured || !targetMemberId) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke<DatingPhotoResponse>(
    "dating-photo-url",
    {
      body: {
        targetMemberId,
      },
    },
  );

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return typeof data?.url === "string" ? data.url : null;
}
