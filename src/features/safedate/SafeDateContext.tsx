import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

export type SafeDateSessionStatus = "active" | "ended-by-me" | "ended";

export type SafeDateSession = {
  id: string;
  datePlanId: string;
  status: SafeDateSessionStatus;
  startedAtLabel: string;
  myEndedAtLabel: string | null;
  theirEndedAtLabel: string | null;
  endedAtLabel: string | null;
  mySideEnded: boolean;
  theirSideEnded: boolean;
};

type SafeDateSessionRow = {
  session_id: string;
  date_plan_id: string;
  started_at: string;
  my_ended_at: string | null;
  their_ended_at: string | null;
  closed_at: string | null;
};

type SafeDateContextValue = {
  sessions: SafeDateSession[];
  isLoadingSession: boolean;
  isMutatingSession: boolean;
  safeDateError: string | null;
  getSessionForDatePlan: (datePlanId: string) => SafeDateSession | null;
  loadSessionForDatePlan: (
    datePlanId: string,
  ) => Promise<SafeDateSession | null>;
  startSession: (datePlanId: string) => Promise<SafeDateSession | null>;
  endMySide: (datePlanId: string) => Promise<SafeDateSession | null>;
};

const SafeDateContext = createContext<SafeDateContextValue | null>(null);

function formatTimestamp(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "SafeDate™ could not update. Please try again.";
}

function sessionFromRow(row: SafeDateSessionRow): SafeDateSession {
  const mySideEnded = Boolean(row.my_ended_at);
  const theirSideEnded = Boolean(row.their_ended_at);
  const fullyEnded = Boolean(row.closed_at);

  return {
    id: row.session_id,
    datePlanId: row.date_plan_id,
    status: fullyEnded ? "ended" : mySideEnded ? "ended-by-me" : "active",
    startedAtLabel: formatTimestamp(row.started_at, "SafeDate™ active"),
    myEndedAtLabel: row.my_ended_at
      ? formatTimestamp(row.my_ended_at, "Ended")
      : null,
    theirEndedAtLabel: row.their_ended_at
      ? formatTimestamp(row.their_ended_at, "Ended")
      : null,
    endedAtLabel: row.closed_at
      ? formatTimestamp(row.closed_at, "Closed")
      : null,
    mySideEnded,
    theirSideEnded,
  };
}

export function SafeDateProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SafeDateSession[]>([]);

  const [isLoadingSession, setIsLoadingSession] = useState(false);

  const [isMutatingSession, setIsMutatingSession] = useState(false);

  const [safeDateError, setSafeDateError] = useState<string | null>(null);

  const getSessionForDatePlan = useCallback(
    (datePlanId: string) =>
      sessions.find((session) => session.datePlanId === datePlanId) ?? null,
    [sessions],
  );

  const storeSession = useCallback((session: SafeDateSession) => {
    setSessions((current) => [
      ...current.filter((item) => item.datePlanId !== session.datePlanId),
      session,
    ]);

    return session;
  }, []);

  const loadSessionForDatePlan = useCallback(
    async (datePlanId: string): Promise<SafeDateSession | null> => {
      const cleanId = datePlanId.trim();

      if (!isSupabaseConfigured || !cleanId) {
        return null;
      }

      setIsLoadingSession(true);
      setSafeDateError(null);

      try {
        const { data, error } = await supabase.rpc("get_safe_date_session", {
          p_date_plan_id: cleanId,
        });

        if (error) {
          throw error;
        }

        const row = ((data ?? [])[0] ?? null) as SafeDateSessionRow | null;

        if (!row) {
          return null;
        }

        return storeSession(sessionFromRow(row));
      } catch (error) {
        setSafeDateError(errorMessage(error));
        return null;
      } finally {
        setIsLoadingSession(false);
      }
    },
    [storeSession],
  );

  const startSession = useCallback(
    async (datePlanId: string): Promise<SafeDateSession | null> => {
      const cleanId = datePlanId.trim();

      if (!isSupabaseConfigured || !cleanId || isMutatingSession) {
        return null;
      }

      setIsMutatingSession(true);
      setSafeDateError(null);

      try {
        const { error } = await supabase.rpc("start_safe_date", {
          p_date_plan_id: cleanId,
        });

        if (error) {
          throw error;
        }

        return await loadSessionForDatePlan(cleanId);
      } catch (error) {
        setSafeDateError(errorMessage(error));
        return null;
      } finally {
        setIsMutatingSession(false);
      }
    },
    [isMutatingSession, loadSessionForDatePlan],
  );

  const endMySide = useCallback(
    async (datePlanId: string): Promise<SafeDateSession | null> => {
      const cleanId = datePlanId.trim();

      if (!isSupabaseConfigured || !cleanId || isMutatingSession) {
        return null;
      }

      setIsMutatingSession(true);
      setSafeDateError(null);

      try {
        const { error } = await supabase.rpc("end_my_safe_date", {
          p_date_plan_id: cleanId,
        });

        if (error) {
          throw error;
        }

        return await loadSessionForDatePlan(cleanId);
      } catch (error) {
        setSafeDateError(errorMessage(error));
        return null;
      } finally {
        setIsMutatingSession(false);
      }
    },
    [isMutatingSession, loadSessionForDatePlan],
  );

  const value = useMemo(
    () => ({
      sessions,
      isLoadingSession,
      isMutatingSession,
      safeDateError,
      getSessionForDatePlan,
      loadSessionForDatePlan,
      startSession,
      endMySide,
    }),
    [
      sessions,
      isLoadingSession,
      isMutatingSession,
      safeDateError,
      getSessionForDatePlan,
      loadSessionForDatePlan,
      startSession,
      endMySide,
    ],
  );

  return (
    <SafeDateContext.Provider value={value}>
      {children}
    </SafeDateContext.Provider>
  );
}

export function useSafeDate() {
  const context = useContext(SafeDateContext);

  if (!context) {
    throw new Error("useSafeDate must be used within SafeDateProvider");
  }

  return context;
}
