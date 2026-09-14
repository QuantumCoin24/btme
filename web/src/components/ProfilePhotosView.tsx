import {
  ChangeEvent,
  useEffect,
  useState
} from 'react'

import {
  loadProfilePhotos,
  removeProfilePhoto,
  saveProfilePhoto,
  type ProfilePhoto
} from '../features/profile/profileMedia'

type Props = {
  onDone: () => void
}

export default function ProfilePhotosView({
  onDone
}: Props) {
  const [
    photos,
    setPhotos
  ] =
    useState<ProfilePhoto[]>([])

  const [
    loading,
    setLoading
  ] =
    useState(true)

  const [
    workingPosition,
    setWorkingPosition
  ] =
    useState<number | null>(
      null
    )

  const [
    error,
    setError
  ] =
    useState<string | null>(
      null
    )

  async function refresh() {
    setLoading(true)
    setError(null)

    try {
      setPhotos(
        await loadProfilePhotos()
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load photos.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function selectPhoto(
    position: number,
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    setWorkingPosition(
      position
    )

    setError(null)

    try {
      await saveProfilePhoto(
        position,
        file
      )

      await refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to save photo.'
      )
    } finally {
      setWorkingPosition(
        null
      )
    }
  }

  async function remove(
    photo: ProfilePhoto
  ) {
    if (
      !window.confirm(
        'Remove this profile photo?'
      )
    ) {
      return
    }

    setWorkingPosition(
      photo.position
    )

    setError(null)

    try {
      await removeProfilePhoto(
        photo
      )

      await refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to remove photo.'
      )
    } finally {
      setWorkingPosition(
        null
      )
    }
  }

  const hero =
    photos.find(
      (photo) =>
        photo.position === 1
    ) ?? null

  const positions =
    [1, 2, 3, 4, 5, 6]

  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Your profile
          </div>

          <h1 className="section-title">
            Show us you.
          </h1>

          <p className="profile-photo-copy">
            Your main photo introduces
            you first. Add up to five
            more photos afterwards.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          Loading your photos…
        </div>
      ) : (
        <>
          <div className="photo-manager-grid">
            {positions.map(
              (position) => {
                const photo =
                  photos.find(
                    (candidate) =>
                      candidate.position ===
                      position
                  ) ?? null

                const busy =
                  workingPosition ===
                  position

                return (
                  <article
                    className={
                      position === 1
                        ? 'photo-slot hero'
                        : 'photo-slot'
                    }
                    key={position}
                  >
                    <div className="photo-slot-image">
                      {photo ? (
                        <img
                          src={photo.signedUrl}
                          alt=""
                        />
                      ) : (
                        <div className="photo-slot-empty">
                          <span>
                            {position === 1
                              ? '♥'
                              : '+'}
                          </span>

                          <strong>
                            {position === 1
                              ? 'Main photo'
                              : `Photo ${position}`}
                          </strong>
                        </div>
                      )}
                    </div>

                    {position === 1 && (
                      <span className="hero-label">
                        HERO
                      </span>
                    )}

                    <div className="photo-slot-actions">
                      <label className="photo-upload-button">
                        {busy
                          ? 'Working…'
                          : photo
                            ? 'Replace'
                            : 'Add photo'}

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                          disabled={busy}
                          onChange={(event) =>
                            void selectPhoto(
                              position,
                              event
                            )
                          }
                        />
                      </label>

                      {photo && (
                        <button
                          type="button"
                          className="photo-remove-button"
                          disabled={busy}
                          onClick={() =>
                            void remove(
                              photo
                            )
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </article>
                )
              }
            )}
          </div>

          <div className="photo-guidance">
            <strong>
              Profile photo rules
            </strong>

            <p>
              JPEG, PNG, WebP, HEIC or HEIF.
              Maximum 10 MB each.
            </p>
          </div>

          <button
            className="primary photo-done-button"
            type="button"
            disabled={!hero}
            onClick={onDone}
          >
            {hero
              ? 'Continue with BTME™'
              : 'Add your main photo to continue'}
          </button>
        </>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}
    </section>
  )
}
