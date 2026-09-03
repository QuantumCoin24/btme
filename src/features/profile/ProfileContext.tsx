import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useAuth,
} from '../auth/AuthContext';
import {
  loadProfilePhotos,
  pickProfileImage,
  ProfilePhoto,
  removeProfilePhoto,
  saveProfilePhoto,
} from './profileMedia';

export type RelationshipIntent =
  | 'relationship'
  | 'life-partner'
  | 'intentional-dating'
  | 'open-genuine';

export type MatchPreference =
  | 'women'
  | 'men'
  | 'everyone';

type ProfileContextValue = {
  relationshipIntent:
    RelationshipIntent | null;
  matchPreference:
    MatchPreference | null;
  minimumAge: number;
  maximumAge: number;
  photos: ProfilePhoto[];
  photosLoading: boolean;
  photoMutationPosition:
    number | null;
  heroPhotoReady: boolean;
  additionalPhotoCount: number;
  heroPhoto:
    ProfilePhoto | null;
  refreshPhotos: () => Promise<void>;
  choosePhoto:
    (position: number) => Promise<void>;
  deletePhoto:
    (position: number) => Promise<void>;
  setRelationshipIntent:
    (value: RelationshipIntent) => void;
  setMatchPreference:
    (value: MatchPreference) => void;
  setMinimumAge:
    (value: number) => void;
  setMaximumAge:
    (value: number) => void;
};

const ProfileContext =
  createContext<
    ProfileContextValue | undefined
  >(undefined);

export function ProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
  } = useAuth();

  const [
    relationshipIntent,
    setRelationshipIntent,
  ] =
    useState<
      RelationshipIntent | null
    >(null);

  const [
    matchPreference,
    setMatchPreference,
  ] =
    useState<
      MatchPreference | null
    >(null);

  const [
    minimumAge,
    setMinimumAge,
  ] =
    useState(25);

  const [
    maximumAge,
    setMaximumAge,
  ] =
    useState(40);

  const [
    photos,
    setPhotos,
  ] =
    useState<ProfilePhoto[]>([]);

  const [
    photosLoading,
    setPhotosLoading,
  ] =
    useState(false);

  const [
    photoMutationPosition,
    setPhotoMutationPosition,
  ] =
    useState<number | null>(null);

  const refreshPhotos =
    useCallback(
      async () => {
        if (!user) {
          setPhotos([]);
          return;
        }

        setPhotosLoading(true);

        try {
          const nextPhotos =
            await loadProfilePhotos();

          setPhotos(nextPhotos);
        } finally {
          setPhotosLoading(false);
        }
      },
      [user],
    );

  useEffect(() => {
    let active = true;

    if (!user) {
      setPhotos([]);
      setPhotosLoading(false);

      return () => {
        active = false;
      };
    }

    setPhotosLoading(true);

    void loadProfilePhotos()
      .then((nextPhotos) => {
        if (active) {
          setPhotos(nextPhotos);
        }
      })
      .catch((error) => {
        console.warn(
          '[BTME] Failed to restore profile photos:',
          error,
        );

        if (active) {
          setPhotos([]);
        }
      })
      .finally(() => {
        if (active) {
          setPhotosLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const choosePhoto =
    useCallback(
      async (
        position: number,
      ) => {
        setPhotoMutationPosition(
          position,
        );

        try {
          const asset =
            await pickProfileImage();

          if (!asset) {
            return;
          }

          const saved =
            await saveProfilePhoto(
              position,
              asset,
            );

          setPhotos(
            (current) => {
              const withoutPosition =
                current.filter(
                  (photo) =>
                    photo.position !==
                    position,
                );

              const normalized =
                saved.isHero
                  ? withoutPosition.map(
                      (photo) => ({
                        ...photo,
                        isHero: false,
                      }),
                    )
                  : withoutPosition;

              return [
                ...normalized,
                saved,
              ].sort(
                (left, right) =>
                  left.position -
                  right.position,
              );
            },
          );
        } finally {
          setPhotoMutationPosition(
            null,
          );
        }
      },
      [],
    );

  const deletePhoto =
    useCallback(
      async (
        position: number,
      ) => {
        const photo =
          photos.find(
            (candidate) =>
              candidate.position ===
              position,
          );

        if (!photo) {
          return;
        }

        setPhotoMutationPosition(
          position,
        );

        try {
          await removeProfilePhoto(
            photo,
          );

          setPhotos(
            (current) =>
              current.filter(
                (candidate) =>
                  candidate.id !==
                  photo.id,
              ),
          );
        } finally {
          setPhotoMutationPosition(
            null,
          );
        }
      },
      [photos],
    );

  const heroPhoto =
    useMemo(
      () =>
        photos.find(
          (photo) =>
            photo.isHero,
        ) ??
        photos.find(
          (photo) =>
            photo.position === 1,
        ) ??
        null,
      [photos],
    );

  const heroPhotoReady =
    heroPhoto !== null;

  const additionalPhotoCount =
    useMemo(
      () =>
        photos.filter(
          (photo) =>
            photo.position > 1,
        ).length,
      [photos],
    );

  const value =
    useMemo<ProfileContextValue>(
      () => ({
        relationshipIntent,
        matchPreference,
        minimumAge,
        maximumAge,
        photos,
        photosLoading,
        photoMutationPosition,
        heroPhotoReady,
        additionalPhotoCount,
        heroPhoto,
        refreshPhotos,
        choosePhoto,
        deletePhoto,
        setRelationshipIntent,
        setMatchPreference,
        setMinimumAge,
        setMaximumAge,
      }),
      [
        relationshipIntent,
        matchPreference,
        minimumAge,
        maximumAge,
        photos,
        photosLoading,
        photoMutationPosition,
        heroPhotoReady,
        additionalPhotoCount,
        heroPhoto,
        refreshPhotos,
        choosePhoto,
        deletePhoto,
      ],
    );

  return (
    <ProfileContext.Provider
      value={value}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context =
    useContext(ProfileContext);

  if (!context) {
    throw new Error(
      'useProfile must be used within ProfileProvider.',
    );
  }

  return context;
}
