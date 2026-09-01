import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type MemberSafetyState = {
  connectionId: string;
  locallyBlocked: boolean;
  reportDraft: string;
};

type MemberSafetyContextValue = {
  memberSafetyStates: MemberSafetyState[];
  getMemberSafetyState: (
    connectionId: string,
  ) => MemberSafetyState;
  toggleLocalBlock: (
    connectionId: string,
  ) => void;
  saveLocalReportDraft: (
    connectionId: string,
    reportDraft: string,
  ) => void;
};

const MemberSafetyContext =
  createContext<MemberSafetyContextValue | null>(
    null,
  );

function emptyState(
  connectionId: string,
): MemberSafetyState {
  return {
    connectionId,
    locallyBlocked: false,
    reportDraft: '',
  };
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

  function getMemberSafetyState(
    connectionId: string,
  ) {
    return (
      memberSafetyStates.find(
        (state) =>
          state.connectionId === connectionId,
      ) ?? emptyState(connectionId)
    );
  }

  function toggleLocalBlock(
    connectionId: string,
  ) {
    setMemberSafetyStates((current) => {
      const existing = current.find(
        (state) =>
          state.connectionId === connectionId,
      );

      const next =
        existing ?? emptyState(connectionId);

      return [
        ...current.filter(
          (state) =>
            state.connectionId !== connectionId,
        ),
        {
          ...next,
          locallyBlocked:
            !next.locallyBlocked,
        },
      ];
    });
  }

  function saveLocalReportDraft(
    connectionId: string,
    reportDraft: string,
  ) {
    setMemberSafetyStates((current) => {
      const existing = current.find(
        (state) =>
          state.connectionId === connectionId,
      );

      const next =
        existing ?? emptyState(connectionId);

      return [
        ...current.filter(
          (state) =>
            state.connectionId !== connectionId,
        ),
        {
          ...next,
          reportDraft: reportDraft.trim(),
        },
      ];
    });
  }

  const value = useMemo(
    () => ({
      memberSafetyStates,
      getMemberSafetyState,
      toggleLocalBlock,
      saveLocalReportDraft,
    }),
    [memberSafetyStates],
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
