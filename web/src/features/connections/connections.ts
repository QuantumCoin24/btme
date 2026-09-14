import { supabase } from '../../lib/supabase'

export type MemberConnection = {
  connectionId: string
  conversationId: string | null
  memberId: string | null
  displayName: string
  photoUrl: string | null
  compatibilityPercent: number | null
  verificationStatus: string | null
  createdAt: string | null
}

function normalizeConnection(
  raw: unknown
): MemberConnection | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw)
  ) {
    return null
  }

  const row =
    raw as Record<string, unknown>

  const connectionId =
    typeof row.connection_id === 'string'
      ? row.connection_id
      : typeof row.id === 'string'
        ? row.id
        : null

  if (!connectionId) {
    return null
  }

  const displayName =
    typeof row.display_name === 'string'
      ? row.display_name
      : typeof row.first_name === 'string'
        ? row.first_name
        : 'BTME connection'

  return {
    connectionId,

    conversationId:
      typeof row.conversation_id === 'string'
        ? row.conversation_id
        : null,

    memberId:
      typeof row.member_id === 'string'
        ? row.member_id
        : typeof row.other_user_id === 'string'
          ? row.other_user_id
          : null,

    displayName,

    photoUrl:
      typeof row.photo_url === 'string'
        ? row.photo_url
        : null,

    compatibilityPercent:
      typeof row.compatibility_percent === 'number'
        ? row.compatibility_percent
        : typeof row.compatibility_score === 'number'
          ? row.compatibility_score
          : null,

    verificationStatus:
      typeof row.verification_status === 'string'
        ? row.verification_status
        : null,

    createdAt:
      typeof row.created_at === 'string'
        ? row.created_at
        : null
  }
}

export async function getMemberConnections():
  Promise<MemberConnection[]> {

  const { data, error } =
    await supabase.rpc(
      'get_member_connections'
    )

  if (error) {
    throw error
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map(normalizeConnection)
    .filter(
      (
        connection
      ): connection is MemberConnection =>
        connection !== null
    )
}
