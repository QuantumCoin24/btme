import { supabase } from '../../lib/supabase'

export type ConnectionSafetyState = {
  blockedByMe: boolean
  reportCount: number
  latestReportId: string | null
  latestReportCreatedAt: string | null
}

type SafetyStateRow = {
  connection_id: string
  i_blocked: boolean
  report_count: number | string
  latest_report_id: string | null
  latest_report_created_at: string | null
}

export async function getConnectionSafetyState(
  connectionId: string
): Promise<ConnectionSafetyState> {
  const cleanId =
    connectionId.trim()

  if (!cleanId) {
    throw new Error(
      'Connection is required.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'get_my_connection_safety_state',
      {
        p_connection_id:
          cleanId
      }
    )

  if (error) {
    throw error
  }

  const row =
    (
      Array.isArray(data)
        ? data[0]
        : data
    ) as SafetyStateRow | null

  if (!row) {
    return {
      blockedByMe: false,
      reportCount: 0,
      latestReportId: null,
      latestReportCreatedAt: null
    }
  }

  return {
    blockedByMe:
      row.i_blocked === true,

    reportCount:
      typeof row.report_count === 'number'
        ? row.report_count
        : Number(
            row.report_count ?? 0
          ),

    latestReportId:
      row.latest_report_id ?? null,

    latestReportCreatedAt:
      row.latest_report_created_at ?? null
  }
}

export async function blockConnectionMember(
  connectionId: string
) {
  const cleanId =
    connectionId.trim()

  if (!cleanId) {
    throw new Error(
      'Connection is required.'
    )
  }

  const { error } =
    await supabase.rpc(
      'block_connection_member',
      {
        p_connection_id:
          cleanId
      }
    )

  if (error) {
    throw error
  }
}

export async function unblockConnectionMember(
  connectionId: string
) {
  const cleanId =
    connectionId.trim()

  if (!cleanId) {
    throw new Error(
      'Connection is required.'
    )
  }

  const { error } =
    await supabase.rpc(
      'unblock_connection_member',
      {
        p_connection_id:
          cleanId
      }
    )

  if (error) {
    throw error
  }
}

export async function reportConnectionMember(
  connectionId: string,
  category: string,
  narrative: string
) {
  const cleanId =
    connectionId.trim()

  const cleanCategory =
    category.trim()

  const cleanNarrative =
    narrative.trim()

  if (!cleanId) {
    throw new Error(
      'Connection is required.'
    )
  }

  if (!cleanCategory) {
    throw new Error(
      'Choose a report category.'
    )
  }

  if (!cleanNarrative) {
    throw new Error(
      'Write a report before submitting.'
    )
  }

  if (cleanCategory.length > 100) {
    throw new Error(
      'Report category is too long.'
    )
  }

  if (cleanNarrative.length > 4000) {
    throw new Error(
      'Reports can be up to 4,000 characters.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'report_connection_member',
      {
        p_connection_id:
          cleanId,

        p_category:
          cleanCategory,

        p_narrative:
          cleanNarrative
      }
    )

  if (error) {
    throw error
  }

  return typeof data === 'string'
    ? data
    : null
}
