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

export type SparkMessage = {
  id: string;
  connectionId: string;
  body: string;
  createdAtLabel: string;
};

export type SparkConversation = {
  connectionId: string;
  messages: SparkMessage[];
};

export type DatePlan = {
  id: string;
  connectionId: string;
  day: string;
  time: string;
  place: string;
  createdAtLabel: string;
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
  sparkConversations: SparkConversation[];
  datePlans: DatePlan[];
  isLoadingDiscovery: boolean;
  isLoadingConnections: boolean;
  isSubmittingDecision: boolean;
  discoveryError: string | null;
  lastMatchedConnectionId: string | null;
  refreshDiscovery: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  likeCurrentProfile: () => Promise<void>;
  passCurrentProfile: () => Promise<void>;
  clearLastMatchedConnection: () => void;
  getConnection: (connectionId: string) => Connection | null;
  getSparkMessages: (connectionId: string) => SparkMessage[];
  addSparkMessage: (connectionId: string, body: string) => void;
  createDatePlan: (
    connectionId: string,
    day: string,
    time: string,
    place: string,
  ) => void;
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

  const [sparkConversations, setSparkConversations] = useState<
    SparkConversation[]
  >([]);

  const [datePlans, setDatePlans] = useState<DatePlan[]>([]);

  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(true);

  const [isLoadingConnections, setIsLoadingConnections] = useState(true);

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

  useEffect(() => {
    void Promise.all([refreshDiscovery(), refreshConnections()]);
  }, [refreshConnections, refreshDiscovery]);

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

  /*
   * Build 23B deliberately leaves Spark messages
   * and date planning local. Their production
   * persistence belongs to subsequent server-backed
   * phases. Connections themselves are authoritative.
   */
  const getSparkMessages = useCallback(
    (connectionId: string) =>
      sparkConversations.find(
        (conversation) => conversation.connectionId === connectionId,
      )?.messages ?? [],
    [sparkConversations],
  );

  const addSparkMessage = useCallback(
    (connectionId: string, body: string) => {
      const trimmedBody = body.trim();

      if (!trimmedBody || !getConnection(connectionId)) {
        return;
      }

      const message: SparkMessage = {
        id: `spark-${connectionId}-${Date.now()}`,
        connectionId,
        body: trimmedBody,
        createdAtLabel: "Just now",
      };

      setSparkConversations((current) => {
        const existing = current.find(
          (conversation) => conversation.connectionId === connectionId,
        );

        if (!existing) {
          return [
            ...current,
            {
              connectionId,
              messages: [message],
            },
          ];
        }

        return current.map((conversation) =>
          conversation.connectionId === connectionId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
              }
            : conversation,
        );
      });
    },
    [getConnection, sparkConversations],
  );

  const createDatePlan = useCallback(
    (connectionId: string, day: string, time: string, place: string) => {
      const cleanDay = day.trim();
      const cleanTime = time.trim();
      const cleanPlace = place.trim();

      if (
        !getConnection(connectionId) ||
        !cleanDay ||
        !cleanTime ||
        !cleanPlace
      ) {
        return;
      }

      const plan: DatePlan = {
        id: `date-${connectionId}-${Date.now()}`,
        connectionId,
        day: cleanDay,
        time: cleanTime,
        place: cleanPlace,
        createdAtLabel: "Planned locally",
      };

      setDatePlans((current) => [plan, ...current]);
    },
    [getConnection],
  );

  const value = useMemo(
    () => ({
      introductions,
      currentProfile,
      connections,
      sparkConversations,
      datePlans,
      isLoadingDiscovery,
      isLoadingConnections,
      isSubmittingDecision,
      discoveryError,
      lastMatchedConnectionId,
      refreshDiscovery,
      refreshConnections,
      likeCurrentProfile,
      passCurrentProfile,
      clearLastMatchedConnection,
      getConnection,
      getSparkMessages,
      addSparkMessage,
      createDatePlan,
    }),
    [
      introductions,
      currentProfile,
      connections,
      sparkConversations,
      datePlans,
      isLoadingDiscovery,
      isLoadingConnections,
      isSubmittingDecision,
      discoveryError,
      lastMatchedConnectionId,
      refreshDiscovery,
      refreshConnections,
      likeCurrentProfile,
      passCurrentProfile,
      clearLastMatchedConnection,
      getConnection,
      getSparkMessages,
      addSparkMessage,
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
