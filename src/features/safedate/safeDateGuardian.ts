import { supabase } from '../../lib/supabase';
import { getSafeDateInstallationRpcArgs } from './safeDateInstallation';

function guardianErrorMessage(
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

export type SafeDateGuardianResponse = {
  escalationId: string;
  status: 'active' | 'acknowledged';
  openedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

type GuardianResponseRow = {
  escalation_id: string;
  status: string;
  opened_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

async function guardianRpc(
  functionName:
    | 'request_my_safe_date_guardian_assistance'
    | 'acknowledge_my_safe_date_guardian_response'
    | 'resolve_my_safe_date_guardian_response',
  datePlanId: string,
) {
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { data, error } = await supabase.rpc(
    functionName as never,
    {
      p_date_plan_id: datePlanId,
      ...installation,
    } as never,
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function loadMySafeDateGuardianResponse(
  datePlanId: string,
): Promise<SafeDateGuardianResponse | null> {
  const installation =
    await getSafeDateInstallationRpcArgs();

  const { data, error } = await supabase.rpc(
    'get_my_safe_date_guardian_response' as never,
    {
      p_date_plan_id: datePlanId,
      ...installation,
    } as never,
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows =
    (data ?? []) as GuardianResponseRow[];

  const row = rows[0];

  if (!row) {
    return null;
  }

  if (
    row.status !== 'active' &&
    row.status !== 'acknowledged'
  ) {
    throw new Error(
      'SafeDate Guardian returned an invalid response state.',
    );
  }

  return {
    escalationId: row.escalation_id,
    status: row.status,
    openedAt: row.opened_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
  };
}

export async function requestMySafeDateGuardianAssistance(
  datePlanId: string,
): Promise<string> {
  const data = await guardianRpc(
    'request_my_safe_date_guardian_assistance',
    datePlanId,
  );

  if (typeof data !== 'string' || !data) {
    throw new Error(
      'SafeDate Guardian did not return an escalation reference.',
    );
  }

  return data;
}

export async function acknowledgeMySafeDateGuardianResponse(
  datePlanId: string,
): Promise<void> {
  await guardianRpc(
    'acknowledge_my_safe_date_guardian_response',
    datePlanId,
  );
}

export async function resolveMySafeDateGuardianResponse(
  datePlanId: string,
): Promise<void> {
  await guardianRpc(
    'resolve_my_safe_date_guardian_response',
    datePlanId,
  );
}

export function safeDateGuardianErrorMessage(
  error: unknown,
) {
  return guardianErrorMessage(
    error,
    'BTME could not update SafeDate Guardian.',
  );
}
