import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

export type MembershipPlan =
  | 'monthly'
  | 'six-month'
  | 'annual';

type MembershipContextValue = {
  selectedPlan: MembershipPlan | null;
  setSelectedPlan: (
    plan: MembershipPlan | null,
  ) => void;
};

const MembershipContext =
  createContext<MembershipContextValue | null>(
    null,
  );

export function MembershipProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    selectedPlan,
    setSelectedPlan,
  ] = useState<MembershipPlan | null>(null);

  const value = useMemo(
    () => ({
      selectedPlan,
      setSelectedPlan,
    }),
    [selectedPlan],
  );

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);

  if (!context) {
    throw new Error(
      'useMembership must be used inside MembershipProvider',
    );
  }

  return context;
}
