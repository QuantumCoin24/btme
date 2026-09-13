import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase';

export type MemberSafetyState = {
  connectionId: string;
  blockedByMe: boolean;
  reportCount: number;
  latestReportId: string | null;
  latestReportCreatedAt: string | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
};

type SafetyStateRow = {
  connection_id: string;
  i_blocked: boolean;
  report_count: number | string;
  latest_report_id: string | null;
  latest_report_created_at: string | null;
};

type MemberSafetyContextValue = {
  memberSafetyStates: MemberSafetyState[];
  getMemberSafetyState: (
    connectionId: string,
  ) => MemberSafetyState;
  refreshMemberSafetyState: (
    connectionId: string,
  ) => Promise<void>;
  blockMember: (
    connectionId: string,
  ) => Promise<void>;
  unblockMember: (
    connectionId: string,
  ) => Promise<void>;
  submitReport: (
    connectionId: string,
    category: string,
    narrative: string,
  ) => Promise<string>;
};

const MemberSafetyContext =
  createContext<MemberSafetyContextValue | null>(
    null,
  );

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Production safety controls require Supabase.',
    );
  }

  return supabase;
}

function emptyState(
  connectionId: string,
): MemberSafetyState {
  return {
    connectionId,
    blockedByMe: false,
    reportCount: 0,
    latestReportId: null,
    latestReportCreatedAt: null,
    loading: false,
    mutating: false,
    error: null,
  };
}

function safetyErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'BTME could not update this safety control.';
}

export function MemberSafetyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    memberSafetyStates,
    setMemberSafetyStates,
  ] = useState<MemberSafetyState[]>([]);

  const getMemberSafetyState = useCallback(
    (connectionId: string) =>
      memberSafetyStates.find(
        (state) =>
          state.connectionId === connectionId,
      ) ?? emptyState(connectionId),
    [memberSafetyStates],
  );

  const patchState = useCallback(
    (
      connectionId: string,
      patch: Partial<MemberSafetyState>,
    ) => {
      setMemberSafetyStates((current) => {
        const existing =
          current.find(
            (state) =>
              state.connectionId === connectionId,
          ) ?? emptyState(connectionId);

        return [
          ...current.filter(
            (state) =>
              state.connectionId !== connectionId,
          ),
          {
            ...existing,
            ...patch,
            connectionId,
          },
        ];
      });
    },
    [],
  );

  const refreshMemberSafetyState =
    useCallback(
      async (connectionId: string) => {
        const cleanConnectionId =
          connectionId.trim();

        if (!cleanConnectionId) {
          return;
        }

        patchState(cleanConnectionId, {
          loading: true,
          error: null,
        });

        try {
          const client = requireSupabase();

          const { data, error } =
            await client.rpc(
              'get_my_connection_safety_state',
              {
                p_connection_id:
                  cleanConnectionId,
              },
            );

          if (error) {
            throw error;
          }

          const row = (
            Array.isArray(data)
              ? data[0]
              : data
          ) as SafetyStateRow | null;

          if (!row) {
            throw new Error(
              'Safety state is unavailable.',
            );
          }

          patchState(cleanConnectionId, {
            blockedByMe: Boolean(
              row.i_blocked,
            ),
            reportCount: Number(
              row.report_count ?? 0,
            ),
            latestReportId:
              row.latest_report_id ?? null,
            latestReportCreatedAt:
              row.latest_report_created_at ??
              null,
            loading: false,
            error: null,
          });
        } catch (error) {
          patchState(cleanConnectionId, {
            loading: false,
            error:
              safetyErrorMessage(error),
          });

          throw error;
        }
      },
      [patchState],
    );

  const blockMember = useCallback(
    async (connectionId: string) => {
      const cleanConnectionId =
        connectionId.trim();

      patchState(cleanConnectionId, {
        mutating: true,
        error: null,
      });

      try {
        const client = requireSupabase();

        const { error } = await client.rpc(
          'block_connection_member',
          {
            p_connection_id:
              cleanConnectionId,
          },
        );

        if (error) {
          throw error;
        }

        await refreshMemberSafetyState(
          cleanConnectionId,
        );
      } catch (error) {
        patchState(cleanConnectionId, {
          error: safetyErrorMessage(error),
        });
        throw error;
      } finally {
        patchState(cleanConnectionId, {
          mutating: false,
        });
      }
    },
    [
      patchState,
      refreshMemberSafetyState,
    ],
  );

  const unblockMember = useCallback(
    async (connectionId: string) => {
      const cleanConnectionId =
        connectionId.trim();

      patchState(cleanConnectionId, {
        mutating: true,
        error: null,
      });

      try {
        const client = requireSupabase();

        const { error } = await client.rpc(
          'unblock_connection_member',
          {
            p_connection_id:
              cleanConnectionId,
          },
        );

        if (error) {
          throw error;
        }

        await refreshMemberSafetyState(
          cleanConnectionId,
        );
      } catch (error) {
        patchState(cleanConnectionId, {
          error: safetyErrorMessage(error),
        });
        throw error;
      } finally {
        patchState(cleanConnectionId, {
          mutating: false,
        });
      }
    },
    [
      patchState,
      refreshMemberSafetyState,
    ],
  );

  const submitReport = useCallback(
    async (
      connectionId: string,
      category: string,
      narrative: string,
    ) => {
      const cleanConnectionId =
        connectionId.trim();
      const cleanNarrative =
        narrative.trim();

      if (!cleanNarrative) {
        throw new Error(
          'Write a report before submitting.',
        );
      }

      patchState(cleanConnectionId, {
        mutating: true,
        error: null,
      });

      try {
        const client = requireSupabase();

        const { data, error } =
          await client.rpc(
            'report_connection_member',
            {
              p_connection_id:
                cleanConnectionId,
              p_category:
                category.trim() || 'other',
              p_narrative:
                cleanNarrative,
            },
          );

        if (error) {
          throw error;
        }

        const reportId =
          typeof data === 'string'
            ? data
            : String(data ?? '');

        if (!reportId) {
          throw new Error(
            'BTME did not return a report reference.',
          );
        }

        await refreshMemberSafetyState(
          cleanConnectionId,
        );

        return reportId;
      } catch (error) {
        patchState(cleanConnectionId, {
          error: safetyErrorMessage(error),
        });
        throw error;
      } finally {
        patchState(cleanConnectionId, {
          mutating: false,
        });
      }
    },
    [
      patchState,
      refreshMemberSafetyState,
    ],
  );

  const value = useMemo(
    () => ({
      memberSafetyStates,
      getMemberSafetyState,
      refreshMemberSafetyState,
      blockMember,
      unblockMember,
      submitReport,
    }),
    [
      memberSafetyStates,
      getMemberSafetyState,
      refreshMemberSafetyState,
      blockMember,
      unblockMember,
      submitReport,
    ],
  );

  return (
    <MemberSafetyContext.Provider
      value={value}
    >
      {children}
    </MemberSafetyContext.Provider>
  );
}

export function useMemberSafety() {
  const context = useContext(
    MemberSafetyContext,
  );

  if (!context) {
    throw new Error(
      'useMemberSafety must be used within MemberSafetyProvider',
    );
  }

  return context;
}
