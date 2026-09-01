import {
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type SeeAgainChoice =
  | 'yes'
  | 'maybe'
  | 'no';

export type DateFeeling =
  | 'great'
  | 'good'
  | 'not-for-me';

export type PrivateDateReflection = {
  id: string;
  datePlanId: string;
  connectionId: string;
  seeAgain: SeeAgainChoice;
  feeling: DateFeeling;
  note: string;
  savedAtLabel: string;
};

type FeedbackContextValue = {
  reflections: PrivateDateReflection[];
  getReflectionForDatePlan: (
    datePlanId: string,
  ) => PrivateDateReflection | null;
  saveLocalReflection: (
    datePlanId: string,
    connectionId: string,
    seeAgain: SeeAgainChoice,
    feeling: DateFeeling,
    note: string,
  ) => void;
};

const FeedbackContext =
  createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    reflections,
    setReflections,
  ] = useState<PrivateDateReflection[]>([]);

  function getReflectionForDatePlan(
    datePlanId: string,
  ) {
    return (
      reflections.find(
        (reflection) =>
          reflection.datePlanId === datePlanId,
      ) ?? null
    );
  }

  function saveLocalReflection(
    datePlanId: string,
    connectionId: string,
    seeAgain: SeeAgainChoice,
    feeling: DateFeeling,
    note: string,
  ) {
    const reflection: PrivateDateReflection = {
      id: `reflection-${datePlanId}-${Date.now()}`,
      datePlanId,
      connectionId,
      seeAgain,
      feeling,
      note: note.trim(),
      savedAtLabel: 'Saved locally',
    };

    setReflections((current) => [
      ...current.filter(
        (item) =>
          item.datePlanId !== datePlanId,
      ),
      reflection,
    ]);
  }

  const value = useMemo(
    () => ({
      reflections,
      getReflectionForDatePlan,
      saveLocalReflection,
    }),
    [reflections],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error(
      'useFeedback must be used within FeedbackProvider',
    );
  }

  return context;
}
