import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type RelationshipModeStatus =
  | 'exploring'
  | 'ended';

export type RelationshipMode = {
  id: string;
  connectionId: string;
  status: RelationshipModeStatus;
  startedAtLabel: string;
  endedAtLabel: string | null;
};

type RelationshipContextValue = {
  relationshipModes: RelationshipMode[];
  getRelationshipMode: (
    connectionId: string,
  ) => RelationshipMode | null;
  startLocalRelationshipMode: (
    connectionId: string,
  ) => void;
  endLocalRelationshipMode: (
    connectionId: string,
  ) => void;
};

const RelationshipContext =
  createContext<RelationshipContextValue | null>(
    null,
  );

export function RelationshipProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    relationshipModes,
    setRelationshipModes,
  ] = useState<RelationshipMode[]>([]);

  function getRelationshipMode(
    connectionId: string,
  ) {
    return (
      relationshipModes.find(
        (mode) =>
          mode.connectionId === connectionId,
      ) ?? null
    );
  }

  function startLocalRelationshipMode(
    connectionId: string,
  ) {
    if (!connectionId.trim()) {
      return;
    }

    const mode: RelationshipMode = {
      id: `relationship-${connectionId}-${Date.now()}`,
      connectionId,
      status: 'exploring',
      startedAtLabel: 'Started locally',
      endedAtLabel: null,
    };

    setRelationshipModes((current) => [
      ...current.filter(
        (item) =>
          item.connectionId !== connectionId,
      ),
      mode,
    ]);
  }

  function endLocalRelationshipMode(
    connectionId: string,
  ) {
    setRelationshipModes((current) =>
      current.map((mode) =>
        mode.connectionId === connectionId &&
        mode.status === 'exploring'
          ? {
              ...mode,
              status: 'ended',
              endedAtLabel: 'Ended locally',
            }
          : mode,
      ),
    );
  }

  const value = useMemo(
    () => ({
      relationshipModes,
      getRelationshipMode,
      startLocalRelationshipMode,
      endLocalRelationshipMode,
    }),
    [relationshipModes],
  );

  return (
    <RelationshipContext.Provider value={value}>
      {children}
    </RelationshipContext.Provider>
  );
}

export function useRelationship() {
  const context = useContext(
    RelationshipContext,
  );

  if (!context) {
    throw new Error(
      'useRelationship must be used within RelationshipProvider',
    );
  }

  return context;
}
