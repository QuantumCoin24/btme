import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type SuccessMomentStatus =
  | 'declared'
  | 'ended';

export type SuccessMoment = {
  id: string;
  connectionId: string;
  status: SuccessMomentStatus;
  declaredAtLabel: string;
  endedAtLabel: string | null;
};

type SuccessContextValue = {
  successMoments: SuccessMoment[];
  getSuccessMoment: (
    connectionId: string,
  ) => SuccessMoment | null;
  declareLocalSuccess: (
    connectionId: string,
  ) => void;
  endLocalSuccess: (
    connectionId: string,
  ) => void;
};

const SuccessContext =
  createContext<SuccessContextValue | null>(
    null,
  );

export function SuccessProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    successMoments,
    setSuccessMoments,
  ] = useState<SuccessMoment[]>([]);

  function getSuccessMoment(
    connectionId: string,
  ) {
    return (
      successMoments.find(
        (moment) =>
          moment.connectionId === connectionId,
      ) ?? null
    );
  }

  function declareLocalSuccess(
    connectionId: string,
  ) {
    if (!connectionId.trim()) {
      return;
    }

    const moment: SuccessMoment = {
      id: `success-${connectionId}-${Date.now()}`,
      connectionId,
      status: 'declared',
      declaredAtLabel: 'Marked locally',
      endedAtLabel: null,
    };

    setSuccessMoments((current) => [
      ...current.filter(
        (item) =>
          item.connectionId !== connectionId,
      ),
      moment,
    ]);
  }

  function endLocalSuccess(
    connectionId: string,
  ) {
    setSuccessMoments((current) =>
      current.map((moment) =>
        moment.connectionId === connectionId &&
        moment.status === 'declared'
          ? {
              ...moment,
              status: 'ended',
              endedAtLabel: 'Ended locally',
            }
          : moment,
      ),
    );
  }

  const value = useMemo(
    () => ({
      successMoments,
      getSuccessMoment,
      declareLocalSuccess,
      endLocalSuccess,
    }),
    [successMoments],
  );

  return (
    <SuccessContext.Provider value={value}>
      {children}
    </SuccessContext.Provider>
  );
}

export function useSuccess() {
  const context = useContext(SuccessContext);

  if (!context) {
    throw new Error(
      'useSuccess must be used within SuccessProvider',
    );
  }

  return context;
}
