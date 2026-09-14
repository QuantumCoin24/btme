import { supabase } from '../../lib/supabase'

export type DiscoveryIntroduction = {
  userId: string
  displayName: string
  age: number | null
  bio: string | null
  city: string | null
  occupation: string | null
  photoUrls: string[]
  compatibilityPercent: number | null
  compatibilitySignals: string[]
  verificationStatus: string | null
}

export type MemberDecision =
  | 'like'
  | 'pass'

export type DecisionResult = {
  matched: boolean
  connectionId: string | null
}

function stringValue(
  row: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = row[key]

    if (
      typeof value === 'string' &&
      value.trim().length > 0
    ) {
      return value
    }
  }

  return null
}

function numberValue(
  row: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = row[key]

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value
    }
  }

  return null
}

function stringArrayValue(
  row: Record<string, unknown>,
  ...keys: string[]
): string[] {
  for (const key of keys) {
    const value = row[key]

    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string =>
          typeof item === 'string'
      )
    }
  }

  return []
}

function normalizeIntroduction(
  raw: unknown
): DiscoveryIntroduction | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw)
  ) {
    return null
  }

  const row =
    raw as Record<string, unknown>

  const userId =
    stringValue(
      row,
      'user_id',
      'member_id',
      'profile_id',
      'id'
    )

  if (!userId) {
    return null
  }

  const displayName =
    stringValue(
      row,
      'display_name',
      'first_name',
      'name'
    ) ?? 'BTME member'

  return {
    userId,
    displayName,

    age:
      numberValue(
        row,
        'age',
        'member_age'
      ),

    bio:
      stringValue(
        row,
        'bio',
        'about_me'
      ),

    city:
      stringValue(
        row,
        'city',
        'location_label'
      ),

    occupation:
      stringValue(
        row,
        'occupation',
        'job_title'
      ),

    photoUrls:
      stringArrayValue(
        row,
        'photo_urls',
        'photos'
      ),

    compatibilityPercent:
      numberValue(
        row,
        'compatibility_percent',
        'compatibility_percentage',
        'compatibility_score'
      ),

    compatibilitySignals:
      stringArrayValue(
        row,
        'compatibility_signals',
        'signals',
        'shared_signals'
      ),

    verificationStatus:
      stringValue(
        row,
        'verification_status'
      )
  }
}

export async function getDiscoveryIntroductions(
  limit = 20
): Promise<DiscoveryIntroduction[]> {
  const { data, error } =
    await supabase.rpc(
      'get_discovery_introductions',
      {
        p_limit: limit
      }
    )

  if (error) {
    throw error
  }

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map(normalizeIntroduction)
    .filter(
      (
        introduction
      ): introduction is DiscoveryIntroduction =>
        introduction !== null
    )
}

export async function recordMemberDecision(
  targetUserId: string,
  decision: MemberDecision
): Promise<DecisionResult> {
  const { data, error } =
    await supabase.rpc(
      'record_member_decision',
      {
        p_target_user_id: targetUserId,
        p_decision: decision
      }
    )

  if (error) {
    throw error
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data

  if (
    !row ||
    typeof row !== 'object'
  ) {
    return {
      matched: false,
      connectionId: null
    }
  }

  const record =
    row as Record<string, unknown>

  return {
    matched:
      record.matched === true,

    connectionId:
      typeof record.connection_id === 'string'
        ? record.connection_id
        : null
  }
}
