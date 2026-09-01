import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

export type ContactMethod = 'phone' | 'email';

type OnboardingState = {
  contactMethod: ContactMethod;
  contact: string;
  birthDate: string;
  firstName: string;
  city: string;
  distance: number;
};

type OnboardingContextValue = OnboardingState & {
  setContactMethod: (value: ContactMethod) => void;
  setContact: (value: string) => void;
  setBirthDate: (value: string) => void;
  setFirstName: (value: string) => void;
  setCity: (value: string) => void;
  setDistance: (value: number) => void;
};

const OnboardingContext =
  createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = {
  children: ReactNode;
};

export function OnboardingProvider({
  children,
}: OnboardingProviderProps) {
  const [contactMethod, setContactMethod] =
    useState<ContactMethod>('phone');

  const [contact, setContact] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [firstName, setFirstName] = useState('');
  const [city, setCity] = useState('');
  const [distance, setDistance] = useState(25);

  const value = useMemo(
    () => ({
      contactMethod,
      contact,
      birthDate,
      firstName,
      city,
      distance,
      setContactMethod,
      setContact,
      setBirthDate,
      setFirstName,
      setCity,
      setDistance,
    }),
    [
      contactMethod,
      contact,
      birthDate,
      firstName,
      city,
      distance,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error(
      'useOnboarding must be used inside OnboardingProvider',
    );
  }

  return context;
}
