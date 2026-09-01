import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type SafeDateSessionStatus =
  | 'active'
  | 'checked-in'
  | 'ended';

export type SafeDateSession = {
  id: string;
  datePlanId: string;
  connectionId: string;
  status: SafeDateSessionStatus;
  startedAtLabel: string;
  checkedInAtLabel: string | null;
  endedAtLabel: string | null;
};

type SafeDateContextValue = {
  sessions: SafeDateSession[];
  getSessionForDatePlan: (
    datePlanId: string,
  ) => SafeDateSession | null;
  startLocalSession: (
    datePlanId: string,
    connectionId: string,
  ) => SafeDateSession;
  checkInLocalSession: (
    sessionId: string,
  ) => void;
  endLocalSession: (
    sessionId: string,
  ) => void;
};

const SafeDateContext =
  createContext<SafeDateContextValue | null>(null);

export function SafeDateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    sessions,
    setSessions,
  ] = useState<SafeDateSession[]>([]);

  function getSessionForDatePlan(
    datePlanId: string,
  ) {
    return (
      sessions.find(
        (session) =>
          session.datePlanId === datePlanId,
      ) ?? null
    );
  }

  function startLocalSession(
    datePlanId: string,
    connectionId: string,
  ) {
    const existing =
      getSessionForDatePlan(datePlanId);

    if (
      existing &&
      existing.status !== 'ended'
    ) {
      return existing;
    }

    const session: SafeDateSession = {
      id: `safedate-${datePlanId}-${Date.now()}`,
      datePlanId,
      connectionId,
      status: 'active',
      startedAtLabel: 'Started locally',
      checkedInAtLabel: null,
      endedAtLabel: null,
    };

    setSessions((current) => [
      ...current.filter(
        (item) =>
          item.datePlanId !== datePlanId,
      ),
      session,
    ]);

    return session;
  }

  function checkInLocalSession(
    sessionId: string,
  ) {
    setSessions((current) =>
      current.map((session) => {
        if (
          session.id !== sessionId ||
          session.status === 'ended'
        ) {
          return session;
        }

        return {
          ...session,
          status: 'checked-in',
          checkedInAtLabel:
            'Checked in locally',
        };
      }),
    );
  }

  function endLocalSession(
    sessionId: string,
  ) {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        return {
          ...session,
          status: 'ended',
          endedAtLabel:
            'Ended locally',
        };
      }),
    );
  }

  const value = useMemo(
    () => ({
      sessions,
      getSessionForDatePlan,
      startLocalSession,
      checkInLocalSession,
      endLocalSession,
    }),
    [sessions],
  );

  return (
    <SafeDateContext.Provider
      value={value}
    >
      {children}
    </SafeDateContext.Provider>
  );
}

export function useSafeDate() {
  const context = useContext(
    SafeDateContext,
  );

  if (!context) {
    throw new Error(
      'useSafeDate must be used within SafeDateProvider',
    );
  }

  return context;
}
