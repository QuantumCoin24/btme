import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

export type LifestyleSignal =
  | 'social'
  | 'homebody'
  | 'fitness'
  | 'food'
  | 'travel'
  | 'outdoors'
  | 'culture'
  | 'family';

export type ChemistryStyle =
  | 'banter'
  | 'deep-talk'
  | 'affection'
  | 'adventure';

export type DealBreaker =
  | 'relationship-goals'
  | 'smoking'
  | 'children'
  | 'distance'
  | 'non-monogamy'
  | 'lifestyle';

type CompatibilityState = {
  lifestyleSignals: LifestyleSignal[];
  perfectSunday: string;
  greenFlag: string;
  absoluteNo: string;
  chemistryStyle: ChemistryStyle | null;
  dealBreakers: DealBreaker[];
};

type CompatibilityContextValue =
  CompatibilityState & {
    toggleLifestyleSignal: (
      value: LifestyleSignal,
    ) => void;

    setPerfectSunday: (
      value: string,
    ) => void;

    setGreenFlag: (
      value: string,
    ) => void;

    setAbsoluteNo: (
      value: string,
    ) => void;

    setChemistryStyle: (
      value: ChemistryStyle,
    ) => void;

    toggleDealBreaker: (
      value: DealBreaker,
    ) => void;
  };

const CompatibilityContext =
  createContext<CompatibilityContextValue | null>(
    null,
  );

type CompatibilityProviderProps = {
  children: ReactNode;
};

export function CompatibilityProvider({
  children,
}: CompatibilityProviderProps) {
  const [
    lifestyleSignals,
    setLifestyleSignals,
  ] = useState<LifestyleSignal[]>([]);

  const [
    perfectSunday,
    setPerfectSunday,
  ] = useState('');

  const [
    greenFlag,
    setGreenFlag,
  ] = useState('');

  const [
    absoluteNo,
    setAbsoluteNo,
  ] = useState('');

  const [
    chemistryStyle,
    setChemistryStyle,
  ] = useState<ChemistryStyle | null>(null);

  const [
    dealBreakers,
    setDealBreakers,
  ] = useState<DealBreaker[]>([]);

  function toggleLifestyleSignal(
    value: LifestyleSignal,
  ) {
    setLifestyleSignals((current) => {
      if (current.includes(value)) {
        return current.filter(
          (item) => item !== value,
        );
      }

      return [
        ...current,
        value,
      ];
    });
  }

  function toggleDealBreaker(
    value: DealBreaker,
  ) {
    setDealBreakers((current) => {
      if (current.includes(value)) {
        return current.filter(
          (item) => item !== value,
        );
      }

      return [
        ...current,
        value,
      ];
    });
  }

  const value = useMemo(
    () => ({
      lifestyleSignals,
      perfectSunday,
      greenFlag,
      absoluteNo,
      chemistryStyle,
      dealBreakers,
      toggleLifestyleSignal,
      setPerfectSunday,
      setGreenFlag,
      setAbsoluteNo,
      setChemistryStyle,
      toggleDealBreaker,
    }),
    [
      lifestyleSignals,
      perfectSunday,
      greenFlag,
      absoluteNo,
      chemistryStyle,
      dealBreakers,
    ],
  );

  return (
    <CompatibilityContext.Provider
      value={value}
    >
      {children}
    </CompatibilityContext.Provider>
  );
}

export function useCompatibility() {
  const context = useContext(
    CompatibilityContext,
  );

  if (!context) {
    throw new Error(
      'useCompatibility must be used inside CompatibilityProvider',
    );
  }

  return context;
}
