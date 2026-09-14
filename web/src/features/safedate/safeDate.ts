import { supabase } from '../../lib/supabase'

export type SafeDateSessionStatus =
  | 'active'
  | 'ended-by-me'
  | 'ended'

export type SafeDateSession = {
  id: string
  datePlanId: string
  status: SafeDateSessionStatus
  startedAt: string
  myEndedAt: string | null
  theirEndedAt: string | null
  closedAt: string | null
  mySideEnded: boolean
  theirSideEnded: boolean
}

type SafeDateSessionRow = {
  session_id: string
  date_plan_id: string
  started_at: string
  my_ended_at: string | null
  their_ended_at: string | null
  closed_at: string | null
}

function mapSession(
  row: SafeDateSessionRow
): SafeDateSession {
  const mySideEnded =
    Boolean(row.my_ended_at)

  const theirSideEnded =
    Boolean(row.their_ended_at)

  const fullyEnded =
    Boolean(row.closed_at)

  return {
    id:
      row.session_id,

    datePlanId:
      row.date_plan_id,

    status:
      fullyEnded
        ? 'ended'
        : mySideEnded
          ? 'ended-by-me'
          : 'active',

    startedAt:
      row.started_at,

    myEndedAt:
      row.my_ended_at,

    theirEndedAt:
      row.their_ended_at,

    closedAt:
      row.closed_at,

    mySideEnded,
    theirSideEnded
  }
}

export async function getSafeDateSession(
  datePlanId: string
): Promise<SafeDateSession | null> {
  const cleanId =
    datePlanId.trim()

  if (!cleanId) {
    return null
  }

  const { data, error } =
    await supabase.rpc(
      'get_safe_date_session',
      {
        p_date_plan_id:
          cleanId
      }
    )

  if (error) {
    throw error
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data

  if (!row) {
    return null
  }

  return mapSession(
    row as SafeDateSessionRow
  )
}

/*
 * SECURITY BOUNDARY
 *
 * start_safe_date and end_my_safe_date are deliberately
 * NOT exposed from the browser client in Build 5.
 *
 * Production requires installation identity:
 *
 *   p_date_plan_id
 *   p_installation_id
 *   p_installation_secret
 *
 * The native client stores installation authority using
 * device-oriented secure storage.
 *
 * Do not reduce that control to ordinary web localStorage.
 */
