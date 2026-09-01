import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

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
};

export type DiscoveryDecision =
  | 'liked'
  | 'passed';

export type Connection = {
  id: string;
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

type DiscoveryContextValue = {
  introductions: DatingProfile[];
  currentProfile: DatingProfile | null;
  connections: Connection[];
  sparkConversations: SparkConversation[];
  likeCurrentProfile: () => void;
  passCurrentProfile: () => void;
  getConnection: (connectionId: string) => Connection | null;
  getSparkMessages: (connectionId: string) => SparkMessage[];
  addSparkMessage: (
    connectionId: string,
    body: string,
  ) => void;
};

const INTRODUCTIONS: DatingProfile[] = [
  {
    id: 'intro-ava',
    firstName: 'Ava',
    age: 31,
    city: 'Manchester',
    headline: 'Big laughs. Small circles. Proper dates.',
    prompt: 'My perfect Sunday',
    promptAnswer:
      'Coffee somewhere good, a long walk, then cooking for people I actually like.',
    compatibility: 91,
    compatibilitySignals: [
      {
        label: 'Intent',
        detail: 'Looking for something real',
      },
      {
        label: 'Chemistry',
        detail: 'Banter with depth',
      },
      {
        label: 'Lifestyle',
        detail: 'Food · family · outdoors',
      },
    ],
    accent: 'A',
  },
  {
    id: 'intro-maya',
    firstName: 'Maya',
    age: 29,
    city: 'Manchester',
    headline: 'Soft heart. Sharp humour.',
    prompt: 'Green flag',
    promptAnswer:
      'Someone who communicates clearly and can still be ridiculous with me.',
    compatibility: 87,
    compatibilitySignals: [
      {
        label: 'Intent',
        detail: 'Intentional dating',
      },
      {
        label: 'Chemistry',
        detail: 'Affection and banter',
      },
      {
        label: 'Lifestyle',
        detail: 'Culture · travel · food',
      },
    ],
    accent: 'M',
  },
  {
    id: 'intro-sophie',
    firstName: 'Sophie',
    age: 33,
    city: 'Salford',
    headline: 'Make me laugh and mean what you say.',
    prompt: 'Absolutely not',
    promptAnswer:
      'Mixed signals. If we like each other, life is complicated enough already.',
    compatibility: 84,
    compatibilitySignals: [
      {
        label: 'Intent',
        detail: 'Relationship minded',
      },
      {
        label: 'Chemistry',
        detail: 'Deep talk',
      },
      {
        label: 'Lifestyle',
        detail: 'Home · family · social',
      },
    ],
    accent: 'S',
  },
];

const DiscoveryContext =
  createContext<DiscoveryContextValue | null>(null);

type DiscoveryProviderProps = {
  children: ReactNode;
};

export function DiscoveryProvider({
  children,
}: DiscoveryProviderProps) {
  const [
    decisions,
    setDecisions,
  ] = useState<
    Record<string, DiscoveryDecision>
  >({});

  const [
    connections,
    setConnections,
  ] = useState<Connection[]>([]);

  const [
    sparkConversations,
    setSparkConversations,
  ] = useState<SparkConversation[]>([]);

  const introductions = useMemo(
    () =>
      INTRODUCTIONS.filter(
        (profile) => !decisions[profile.id],
      ),
    [decisions],
  );

  const currentProfile =
    introductions[0] ?? null;

  function passCurrentProfile() {
    if (!currentProfile) {
      return;
    }

    setDecisions((current) => ({
      ...current,
      [currentProfile.id]: 'passed',
    }));
  }

  function likeCurrentProfile() {
    if (!currentProfile) {
      return;
    }

    const profile = currentProfile;

    setDecisions((current) => ({
      ...current,
      [profile.id]: 'liked',
    }));

    setConnections((current) => {
      if (
        current.some(
          (connection) =>
            connection.profile.id === profile.id,
        )
      ) {
        return current;
      }

      return [
        ...current,
        {
          id: `connection-${profile.id}`,
          profile,
          connectedAtLabel: 'New connection',
        },
      ];
    });
  }

  function getConnection(
    connectionId: string,
  ) {
    return (
      connections.find(
        (connection) =>
          connection.id === connectionId,
      ) ?? null
    );
  }

  function getSparkMessages(
    connectionId: string,
  ) {
    return (
      sparkConversations.find(
        (conversation) =>
          conversation.connectionId ===
          connectionId,
      )?.messages ?? []
    );
  }

  function addSparkMessage(
    connectionId: string,
    body: string,
  ) {
    const trimmedBody = body.trim();

    if (
      !trimmedBody ||
      !getConnection(connectionId)
    ) {
      return;
    }

    const message: SparkMessage = {
      id: `spark-${connectionId}-${Date.now()}`,
      connectionId,
      body: trimmedBody,
      createdAtLabel: 'Just now',
    };

    setSparkConversations((current) => {
      const existing = current.find(
        (conversation) =>
          conversation.connectionId ===
          connectionId,
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
        conversation.connectionId ===
        connectionId
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                message,
              ],
            }
          : conversation,
      );
    });
  }

  const value = useMemo(
    () => ({
      introductions,
      currentProfile,
      connections,
      sparkConversations,
      likeCurrentProfile,
      passCurrentProfile,
      getConnection,
      getSparkMessages,
      addSparkMessage,
    }),
    [
      introductions,
      currentProfile,
      connections,
      sparkConversations,
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
    throw new Error(
      'useDiscovery must be used inside DiscoveryProvider',
    );
  }

  return context;
}
