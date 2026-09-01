import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

export type RelationshipIntent =
  | 'relationship'
  | 'life-partner'
  | 'intentional-dating'
  | 'open-genuine';

export type MatchPreference =
  | 'women'
  | 'men'
  | 'everyone';

type ProfileState = {
  heroPhotoReady: boolean;
  additionalPhotoCount: number;
  relationshipIntent: RelationshipIntent | null;
  matchPreference: MatchPreference | null;
  minimumAge: number;
  maximumAge: number;
};

type ProfileContextValue =
  ProfileState & {
    setHeroPhotoReady: (value: boolean) => void;
    setAdditionalPhotoCount: (value: number) => void;
    setRelationshipIntent: (
      value: RelationshipIntent,
    ) => void;
    setMatchPreference: (
      value: MatchPreference,
    ) => void;
    setMinimumAge: (value: number) => void;
    setMaximumAge: (value: number) => void;
  };

const ProfileContext =
  createContext<ProfileContextValue | null>(null);

type ProfileProviderProps = {
  children: ReactNode;
};

export function ProfileProvider({
  children,
}: ProfileProviderProps) {
  const [
    heroPhotoReady,
    setHeroPhotoReady,
  ] = useState(false);

  const [
    additionalPhotoCount,
    setAdditionalPhotoCount,
  ] = useState(0);

  const [
    relationshipIntent,
    setRelationshipIntent,
  ] = useState<RelationshipIntent | null>(null);

  const [
    matchPreference,
    setMatchPreference,
  ] = useState<MatchPreference | null>(null);

  const [
    minimumAge,
    setMinimumAge,
  ] = useState(25);

  const [
    maximumAge,
    setMaximumAge,
  ] = useState(40);

  const value = useMemo(
    () => ({
      heroPhotoReady,
      additionalPhotoCount,
      relationshipIntent,
      matchPreference,
      minimumAge,
      maximumAge,
      setHeroPhotoReady,
      setAdditionalPhotoCount,
      setRelationshipIntent,
      setMatchPreference,
      setMinimumAge,
      setMaximumAge,
    }),
    [
      heroPhotoReady,
      additionalPhotoCount,
      relationshipIntent,
      matchPreference,
      minimumAge,
      maximumAge,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error(
      'useProfile must be used inside ProfileProvider',
    );
  }

  return context;
}
