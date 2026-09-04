import { supabase } from '../../lib/supabase';

export type SafeDateProtection = {
  safeDateSessionId: string;
  checkInIntervalMinutes: number | null;
  nextCheckInAt: string | null;
  lastCheckInAt: string | null;
  safeArrivalConfirmedAt: string | null;
  assistanceRequestedAt: string | null;
  trustedContactEnabled: boolean;
  locationSharingEnabled: boolean;
  locationSharingExpiresAt: string | null;
};

type ProtectionRow = {
  safe_date_session_id: string;
  check_in_interval_minutes: number | null;
  next_check_in_at: string | null;
  last_check_in_at: string | null;
  safe_arrival_confirmed_at: string | null;
  assistance_requested_at: string | null;
  trusted_contact_enabled: boolean;
  location_sharing_enabled: boolean;
  location_sharing_expires_at: string | null;
};

function mapProtection(
  row: ProtectionRow,
): SafeDateProtection {
  return {
    safeDateSessionId: row.safe_date_session_id,
    checkInIntervalMinutes:
      row.check_in_interval_minutes,
    nextCheckInAt: row.next_check_in_at,
    lastCheckInAt: row.last_check_in_at,
    safeArrivalConfirmedAt:
      row.safe_arrival_confirmed_at,
    assistanceRequestedAt:
      row.assistance_requested_at,
    trustedContactEnabled:
      row.trusted_contact_enabled,
    locationSharingEnabled:
      row.location_sharing_enabled,
    locationSharingExpiresAt:
      row.location_sharing_expires_at,
  };
}

function messageFromError(
  error: unknown,
  fallback: string,
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

async function invokeVoid(
  functionName: string,
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(
    functionName as never,
    args as never,
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadMySafeDateProtection(
  datePlanId: string,
): Promise<SafeDateProtection> {
  const { data, error } = await supabase.rpc(
    'get_my_safe_date_protection' as never,
    {
      p_date_plan_id: datePlanId,
    } as never,
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProtectionRow[];

  if (!rows[0]) {
    throw new Error(
      'SafeDate protection state is unavailable.',
    );
  }

  return mapProtection(rows[0]);
}

export async function configureMySafeDateCheckIn(
  datePlanId: string,
  intervalMinutes: number | null,
) {
  await invokeVoid(
    'configure_my_safe_date_check_in',
    {
      p_date_plan_id: datePlanId,
      p_interval_minutes: intervalMinutes,
    },
  );
}

export async function checkInMySafeDate(
  datePlanId: string,
) {
  await invokeVoid(
    'check_in_my_safe_date',
    {
      p_date_plan_id: datePlanId,
    },
  );
}

export async function requestMySafeDateAssistance(
  datePlanId: string,
) {
  await invokeVoid(
    'request_my_safe_date_assistance',
    {
      p_date_plan_id: datePlanId,
    },
  );
}

export async function clearMySafeDateAssistance(
  datePlanId: string,
) {
  await invokeVoid(
    'clear_my_safe_date_assistance',
    {
      p_date_plan_id: datePlanId,
    },
  );
}

export async function confirmMySafeArrival(
  datePlanId: string,
) {
  await invokeVoid(
    'confirm_my_safe_arrival',
    {
      p_date_plan_id: datePlanId,
    },
  );
}

export async function setMySafeDateLocationConsent(
  datePlanId: string,
  enabled: boolean,
  durationMinutes = 120,
) {
  await invokeVoid(
    'set_my_safe_date_location_consent',
    {
      p_date_plan_id: datePlanId,
      p_enabled: enabled,
      p_duration_minutes: durationMinutes,
    },
  );
}

export function safeDateProtectionErrorMessage(
  error: unknown,
) {
  return messageFromError(
    error,
    'BTME could not update your SafeDate protection.',
  );
}
