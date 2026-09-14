import { supabase } from '../../lib/supabase'

export type DatePlan = {
  id: string
  connectionId: string
  createdBy: string | null
  scheduledFor: string
  placeName: string
  status: string
  createdAt: string | null
  updatedAt: string | null
}

type DatePlanRow = {
  date_plan_id: string
  connection_id: string
  created_by: string | null
  scheduled_for: string
  place_name: string
  status: string
  created_at: string | null
  updated_at: string | null
}

function mapDatePlan(
  row: DatePlanRow
): DatePlan {
  return {
    id: row.date_plan_id,
    connectionId: row.connection_id,
    createdBy: row.created_by,
    scheduledFor: row.scheduled_for,
    placeName: row.place_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getMemberDatePlans():
  Promise<DatePlan[]> {

  const { data, error } =
    await supabase.rpc(
      'get_member_date_plans'
    )

  if (error) {
    throw error
  }

  if (!Array.isArray(data)) {
    return []
  }

  return (
    data as DatePlanRow[]
  ).map(mapDatePlan)
}

export async function createMemberDatePlan(
  connectionId: string,
  scheduledFor: string,
  placeName: string
): Promise<DatePlan | null> {

  const cleanConnectionId =
    connectionId.trim()

  const cleanPlace =
    placeName.trim()

  if (
    !cleanConnectionId ||
    !cleanPlace
  ) {
    throw new Error(
      'Connection and place are required.'
    )
  }

  const scheduled =
    new Date(scheduledFor)

  if (
    Number.isNaN(
      scheduled.getTime()
    )
  ) {
    throw new Error(
      'Choose a valid date and time.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'create_member_date_plan',
      {
        p_connection_id:
          cleanConnectionId,

        p_scheduled_for:
          scheduled.toISOString(),

        p_place_name:
          cleanPlace
      }
    )

  if (error) {
    throw error
  }

  const createdId =
    typeof data === 'string'
      ? data
      : null

  if (!createdId) {
    return null
  }

  const plans =
    await getMemberDatePlans()

  return (
    plans.find(
      (plan) =>
        plan.id === createdId
    ) ?? null
  )
}
