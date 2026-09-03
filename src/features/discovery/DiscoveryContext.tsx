import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { isSupabaseConfigured, supabase } from "../../lib/supabase";

export type CompatibilitySignal = {
  label: string;
  detail: string;
};

export type DatingProfile = {
  id: string;
  firstName: string;
  age: number;
  city: string;
  headline: string;
  prompt: string;
  promptAnswer: string;
  compatibility: number;
  compatibilitySignals: CompatibilitySignal[];
  accent: string;
  verified?: boolean;
};

export type Connection = {
  id: string;
  conversationId?: string | null;
  profile: DatingProfile;
  connectedAtLabel: string;
};

export type DatePlan = {
  id: string;
  connectionId: string;
  day: string;
  time: string;
  place: string;
  createdAtLabel: string;
};

type MemberDatePlanRow = {
  date_plan_id: string;
  connection_id: string;
  created_by: string;
  scheduled_for: string;
  place_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type DiscoveryIntroductionRow = {
  member_id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  relationship_intent: string | null;
  lifestyle_signals: string[] | null;
  perfect_sunday: string | null;
  green_flag: string | null;
  chemistry_style: string | null;
  compatibility_score: number | null;
  verified: boolean | null;
};

type DecisionRow = {
  matched: boolean | null;
  connection_id: string | null;
  conversation_id: string | null;
};

type MemberConnectionRow = {
  connection_id: string;
  conversation_id: string | null;
  member_id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  connected_at: string | null;
  verified: boolean | null;
};

type DiscoveryContextValue = {
  introductions: DatingProfile[];
  currentProfile: DatingProfile | null;
  connections: Connection[];
  datePlans: DatePlan[];
  isLoadingDiscovery: boolean;
  isLoadingConnections: boolean;
  isLoadingDatePlans: boolean;
  isCreatingDatePlan: boolean;
  isSubmittingDecision: boolean;
  discoveryError: string | null;
  lastMatchedConnectionId: string | null;
  refreshDiscovery: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshDatePlans: () => Promise<void>;
  likeCurrentProfile: () => Promise<void>;
  passCurrentProfile: () => Promise<void>;
  clearLastMatchedConnection: () => void;
  getConnection: (connectionId: string) => Connection | null;
  createDatePlan: (
    connectionId: string,
    day: string,
    time: string,
    place: string,
  ) => Promise<DatePlan | null>;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

type DiscoveryProviderProps = {
  children: ReactNode;
};

function titleCase(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function introductionToProfile(row: DiscoveryIntroductionRow): DatingProfile {
  const firstName = row.first_name?.trim() || "Member";

  const lifestyle = row.lifestyle_signals?.filter(Boolean) ?? [];

  const intent = titleCase(row.relationship_intent);

  const chemistry = titleCase(row.chemistry_style);

  const signals: CompatibilitySignal[] = [];

  if (intent) {
    signals.push({
      label: "Intent",
      detail: intent,
    });
  }

  if (chemistry) {
    signals.push({
      label: "Chemistry",
      detail: chemistry,
    });
  }

  if (lifestyle.length > 0) {
    signals.push({
      label: "Lifestyle",
      detail: lifestyle.slice(0, 3).map(titleCase).join(" · "),
    });
  }

  const hasPerfectSunday = Boolean(row.perfect_sunday?.trim());

  const prompt = hasPerfectSunday ? "My perfect Sunday" : "Green flag";

  const promptAnswer = hasPerfectSunday
    ? row.perfect_sunday?.trim() || ""
    : row.green_flag?.trim() || "";

  const headlineParts = [intent || null, chemistry || null].filter(Boolean);

  return {
    id: row.member_id,
    firstName,
    age: Math.max(18, row.age ?? 18),
    city: row.city?.trim() || "Location private",
    headline: headlineParts.join(" · ") || "Here for something worth finding.",
    prompt,
    promptAnswer: promptAnswer || "Still adding the finishing touches.",
    compatibility: Math.max(0, Math.min(100, row.compatibility_score ?? 0)),
    compatibilitySignals: signals,
    accent: firstName.charAt(0).toUpperCase() || "♥",
    verified: Boolean(row.verified),
  };
}

function connectionToProfile(row: MemberConnectionRow): DatingProfile {
  const firstName = row.first_name?.trim() || "Member";

  return {
    id: row.member_id,
    firstName,
    age: Math.max(18, row.age ?? 18),
    city: row.city?.trim() || "Location private",
    headline: row.verified ? "Verified BTME™ connection" : "BTME™ connection",
    prompt: "Connection",
    promptAnswer: "You both chose to explore this.",
    compatibility: 0,
    compatibilitySignals: [],
    accent: firstName.charAt(0).toUpperCase() || "♥",
    verified: Boolean(row.verified),
  };
}

function connectedAtLabel(value: string | null) {
  if (!value) {
    return "New connection";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Connected";
  }

  return `Connected ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

function datePlanFromRow(row: MemberDatePlanRow): DatePlan {
  const scheduled = new Date(row.scheduled_for);

  return {
    id: row.date_plan_id,
    connectionId: row.connection_id,
    day: Number.isNaN(scheduled.getTime())
      ? "Date planned"
      : scheduled.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
    time: Number.isNaN(scheduled.getTime())
      ? ""
      : scheduled.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
    place: row.place_name.trim(),
    createdAtLabel: "Saved",
  };
}

function parseDateInput(day: string, time: string) {
  const direct = new Date(`${day} ${time}`);

  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const isoLike = new Date(`${day}T${time}`);

  if (!Number.isNaN(isoLike.getTime())) {
    return isoLike;
  }

  return null;
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

  return "Something went wrong. Please try again.";
}

export function DiscoveryProvider({ children }: DiscoveryProviderProps) {
  const [introductions, setIntroductions] = useState<DatingProfile[]>([]);

  const [connections, setConnections] = useState<Connection[]>([]);

  const [datePlans, setDatePlans] = useState<DatePlan[]>([]);

  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(true);

  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [isLoadingDatePlans, setIsLoadingDatePlans] = useState(true);
  const [isCreatingDatePlan, setIsCreatingDatePlan] = useState(false);

  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [lastMatchedConnectionId, setLastMatchedConnectionId] = useState<
    string | null
  >(null);

  const currentProfile = introductions[0] ?? null;

  const refreshDiscovery = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIntroductions([]);
      setDiscoveryError(
        "Discovery is unavailable until Supabase is configured.",
      );
      setIsLoadingDiscovery(false);
      return;
    }

    setIsLoadingDiscovery(true);

    try {
      const { data, error } = await supabase.rpc(
        "get_discovery_introductions",
        {
          p_limit: 20,
        },
      );

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as DiscoveryIntroductionRow[];

      setIntroductions(rows.map(introductionToProfile));

      setDiscoveryError(null);
    } catch (error) {
      setDiscoveryError(errorMessage(error));
    } finally {
      setIsLoadingDiscovery(false);
    }
  }, []);

  const refreshConnections = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setConnections([]);
      setIsLoadingConnections(false);
      return;
    }

    setIsLoadingConnections(true);

    try {
      const { data, error } = await supabase.rpc("get_member_connections");

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as MemberConnectionRow[];

      setConnections(
        rows.map((row) => ({
          id: row.connection_id,
          conversationId: row.conversation_id,
          profile: connectionToProfile(row),
          connectedAtLabel: connectedAtLabel(row.connected_at),
        })),
      );
    } catch (error) {
      setDiscoveryError(errorMessage(error));
    } finally {
      setIsLoadingConnections(false);
    }
  }, []);

  const refreshDatePlans = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setDatePlans([]);
      setIsLoadingDatePlans(false);
      return;
    }

    setIsLoadingDatePlans(true);

    try {
      const { data, error } = await supabase.rpc("get_member_date_plans");

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as MemberDatePlanRow[];
      setDatePlans(rows.map(datePlanFromRow));
    } catch (error) {
      setDiscoveryError(errorMessage(error));
    } finally {
      setIsLoadingDatePlans(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      refreshDiscovery(),
      refreshConnections(),
      refreshDatePlans(),
    ]);
  }, [refreshConnections, refreshDatePlans, refreshDiscovery]);

  const submitDecision = useCallback(
    async (profile: DatingProfile, decision: "like" | "pass") => {
      if (isSubmittingDecision || !isSupabaseConfigured) {
        return;
      }

      setIsSubmittingDecision(true);
      setDiscoveryError(null);

      try {
        const { data, error } = await supabase.rpc("record_member_decision", {
          p_target_id: profile.id,
          p_decision: decision,
        });

        if (error) {
          throw error;
        }

        const result = ((data ?? [])[0] ?? null) as DecisionRow | null;

        setIntroductions((current) =>
          current.filter((candidate) => candidate.id !== profile.id),
        );

        if (result?.matched && result.connection_id) {
          setLastMatchedConnectionId(result.connection_id);

          await refreshConnections();
        }
      } catch (error) {
        setDiscoveryError(errorMessage(error));
      } finally {
        setIsSubmittingDecision(false);
      }
    },
    [isSubmittingDecision, refreshConnections],
  );

  const passCurrentProfile = useCallback(async () => {
    if (!currentProfile) {
      return;
    }

    await submitDecision(currentProfile, "pass");
  }, [currentProfile, submitDecision]);

  const likeCurrentProfile = useCallback(async () => {
    if (!currentProfile) {
      return;
    }

    await submitDecision(currentProfile, "like");
  }, [currentProfile, submitDecision]);

  const clearLastMatchedConnection = useCallback(() => {
    setLastMatchedConnectionId(null);
  }, []);

  const getConnection = useCallback(
    (connectionId: string) =>
      connections.find((connection) => connection.id === connectionId) ?? null,
    [connections],
  );

  const createDatePlan = useCallback(
    async (
      connectionId: string,
      day: string,
      time: string,
      place: string,
    ): Promise<DatePlan | null> => {
      const cleanConnectionId = connectionId.trim();
      const cleanDay = day.trim();
      const cleanTime = time.trim();
      const cleanPlace = place.trim();

      if (
        !isSupabaseConfigured ||
        !getConnection(cleanConnectionId) ||
        !cleanDay ||
        !cleanTime ||
        !cleanPlace ||
        isCreatingDatePlan
      ) {
        return null;
      }

      const scheduledFor = parseDateInput(cleanDay, cleanTime);

      if (!scheduledFor) {
        setDiscoveryError("Choose a valid date and time.");
        return null;
      }

      setIsCreatingDatePlan(true);
      setDiscoveryError(null);

      try {
        const { data, error } = await supabase.rpc("create_member_date_plan", {
          p_connection_id: cleanConnectionId,
          p_scheduled_for: scheduledFor.toISOString(),
          p_place_name: cleanPlace,
        });

        if (error) {
          throw error;
        }

        const createdId = typeof data === "string" ? data : null;

        const { data: rows, error: readError } = await supabase.rpc(
          "get_member_date_plans",
        );

        if (readError) {
          throw readError;
        }

        const mappedRows = ((rows ?? []) as MemberDatePlanRow[]).map(
          datePlanFromRow,
        );

        setDatePlans(mappedRows);

        if (!createdId) {
          return null;
        }

        return mappedRows.find((plan) => plan.id === createdId) ?? null;
      } catch (error) {
        setDiscoveryError(errorMessage(error));
        return null;
      } finally {
        setIsCreatingDatePlan(false);
      }
    },
    [getConnection, isCreatingDatePlan],
  );

  const value = useMemo(
    () => ({
      introductions,
      currentProfile,
      connections,
      datePlans,
      isLoadingDiscovery,
      isLoadingConnections,
      isLoadingDatePlans,
      isCreatingDatePlan,
      isSubmittingDecision,
      discoveryError,
      lastMatchedConnectionId,
      refreshDiscovery,
      refreshConnections,
      refreshDatePlans,
      likeCurrentProfile,
      passCurrentProfile,
      clearLastMatchedConnection,
      getConnection,
      createDatePlan,
    }),
    [
      introductions,
      currentProfile,
      connections,
      datePlans,
      isLoadingDiscovery,
      isLoadingConnections,
      isLoadingDatePlans,
      isCreatingDatePlan,
      isSubmittingDecision,
      discoveryError,
      lastMatchedConnectionId,
      refreshDiscovery,
      refreshConnections,
      refreshDatePlans,
      likeCurrentProfile,
      passCurrentProfile,
      clearLastMatchedConnection,
      getConnection,
      createDatePlan,
    ],
  );

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext);

  if (!context) {
    throw new Error("useDiscovery must be used inside DiscoveryProvider");
  }

  return context;
}
