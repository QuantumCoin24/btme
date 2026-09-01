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

type DiscoveryContextValue = {
  introductions: DatingProfile[];
  currentProfile: DatingProfile | null;
  connections: Connection[];
  likeCurrentProfile: () => void;
  passCurrentProfile: () => void;
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

  const value = useMemo(
    () => ({
      introductions,
      currentProfile,
      connections,
      likeCurrentProfile,
      passCurrentProfile,
    }),
    [
      introductions,
      currentProfile,
      connections,
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
