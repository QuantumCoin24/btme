import {
  FormEvent,
  useEffect,
  useState
} from 'react'

import {
  loadMyMemberProfile,
  updateMyMemberProfile,
  type MemberProfile
} from '../features/profile/memberProfile'

type Props = {
  verificationStatus:
    string | null
  membershipStatus:
    string | null
}

export default function YouView({
  verificationStatus,
  membershipStatus
}: Props) {
  const [
    profile,
    setProfile
  ] =
    useState<MemberProfile | null>(
      null
    )

  const [
    loading,
    setLoading
  ] =
    useState(true)

  const [
    saving,
    setSaving
  ] =
    useState(false)

  const [
    saved,
    setSaved
  ] =
    useState(false)

  const [
    error,
    setError
  ] =
    useState<string | null>(
      null
    )

  const [
    city,
    setCity
  ] =
    useState('')

  const [
    bio,
    setBio
  ] =
    useState('')

  const [
    minimumAge,
    setMinimumAge
  ] =
    useState(18)

  const [
    maximumAge,
    setMaximumAge
  ] =
    useState(99)

  const [
    distanceMiles,
    setDistanceMiles
  ] =
    useState(25)

  const [
    perfectSunday,
    setPerfectSunday
  ] =
    useState('')

  const [
    greenFlag,
    setGreenFlag
  ] =
    useState('')

  const [
    absoluteNo,
    setAbsoluteNo
  ] =
    useState('')

  function hydrate(
    value: MemberProfile
  ) {
    setProfile(value)

    setCity(
      value.city
    )

    setBio(
      value.bio
    )

    setMinimumAge(
      value.minimumAge
    )

    setMaximumAge(
      value.maximumAge
    )

    setDistanceMiles(
      value.distanceMiles
    )

    setPerfectSunday(
      value.perfectSunday
    )

    setGreenFlag(
      value.greenFlag
    )

    setAbsoluteNo(
      value.absoluteNo
    )
  }

  useEffect(() => {
    let active = true

    setLoading(true)

    void loadMyMemberProfile()
      .then((value) => {
        if (!active) {
          return
        }

        hydrate(value)
      })
      .catch((caught) => {
        if (!active) {
          return
        }

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load your profile.'
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) {
      return
    }

    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const updated =
        await updateMyMemberProfile({
          city,
          bio,
          minimumAge,
          maximumAge,
          distanceMiles,
          perfectSunday,
          greenFlag,
          absoluteNo
        })

      hydrate(updated)

      setSaved(true)

      window.setTimeout(
        () => {
          setSaved(false)
        },
        2500
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to save your profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section>
        <div className="empty-state">
          Loading your BTME™ profile…
        </div>
      </section>
    )
  }

  if (!profile) {
    return (
      <section>
        <div className="empty-state">
          <h3>
            Profile unavailable.
          </h3>

          {error && (
            <p>
              {error}
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            You
          </div>

          <h1 className="section-title">
            Your profile.
            <br />
            Your standards.
          </h1>
        </div>
      </div>

      <div className="you-layout">
        <aside className="profile-preview-card">
          <div className="profile-monogram">
            {profile.firstName
              .slice(0, 1)
              .toUpperCase() ||
              '♥'}
          </div>

          <h2>
            {profile.firstName ||
              'BTME™ member'}
          </h2>

          <p className="profile-location">
            {profile.city ||
              'Location not set'}
          </p>

          {profile.bio && (
            <p className="profile-bio">
              {profile.bio}
            </p>
          )}

          <div className="profile-authority-grid">
            <div>
              <span>
                Verification
              </span>

              <strong>
                {verificationStatus ??
                  'Not verified'}
              </strong>
            </div>

            <div>
              <span>
                Membership
              </span>

              <strong>
                {membershipStatus ??
                  'Not active'}
              </strong>
            </div>
          </div>

          {profile.relationshipIntent && (
            <div className="profile-readonly">
              <span>
                Relationship intent
              </span>

              <strong>
                {profile.relationshipIntent}
              </strong>
            </div>
          )}

          {profile.chemistryStyle && (
            <div className="profile-readonly">
              <span>
                Chemistry
              </span>

              <strong>
                {profile.chemistryStyle}
              </strong>
            </div>
          )}

          {profile.lifestyleSignals.length >
            0 && (
            <div className="signal-list">
              {profile.lifestyleSignals.map(
                (signal) => (
                  <span
                    className="signal"
                    key={signal}
                  >
                    {signal}
                  </span>
                )
              )}
            </div>
          )}
        </aside>

        <form
          className="profile-editor"
          onSubmit={submit}
        >
          <div className="profile-section">
            <div className="eyebrow">
              Basics
            </div>

            <h2>
              About you
            </h2>

            <label htmlFor="profile-name">
              First name
            </label>

            <input
              id="profile-name"
              type="text"
              value={profile.firstName}
              disabled
            />

            <p className="field-note">
              Identity fields are protected
              after onboarding.
            </p>

            <label htmlFor="profile-city">
              City
            </label>

            <input
              id="profile-city"
              type="text"
              value={city}
              maxLength={120}
              onChange={(event) =>
                setCity(
                  event.target.value
                )
              }
            />

            <label htmlFor="profile-bio">
              Bio
            </label>

            <textarea
              id="profile-bio"
              rows={5}
              value={bio}
              maxLength={1000}
              onChange={(event) =>
                setBio(
                  event.target.value
                )
              }
              placeholder="Tell people what makes you, you."
            />
          </div>

          <div className="profile-section">
            <div className="eyebrow">
              Discovery
            </div>

            <h2>
              Your preferences
            </h2>

            <div className="profile-grid">
              <div>
                <label htmlFor="minimum-age">
                  Minimum age
                </label>

                <input
                  id="minimum-age"
                  type="number"
                  min={18}
                  max={99}
                  value={minimumAge}
                  onChange={(event) =>
                    setMinimumAge(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="maximum-age">
                  Maximum age
                </label>

                <input
                  id="maximum-age"
                  type="number"
                  min={18}
                  max={99}
                  value={maximumAge}
                  onChange={(event) =>
                    setMaximumAge(
                      Number(
                        event.target.value
                      )
                    )
                  }
                />
              </div>
            </div>

            <label htmlFor="distance">
              Maximum distance
            </label>

            <div className="distance-control">
              <input
                id="distance"
                type="range"
                min={1}
                max={100}
                value={distanceMiles}
                onChange={(event) =>
                  setDistanceMiles(
                    Number(
                      event.target.value
                    )
                  )
                }
              />

              <strong>
                {distanceMiles} miles
              </strong>
            </div>
          </div>

          <div className="profile-section">
            <div className="eyebrow">
              Compatibility
            </div>

            <h2>
              The good stuff
            </h2>

            <label htmlFor="perfect-sunday">
              My perfect Sunday
            </label>

            <textarea
              id="perfect-sunday"
              rows={3}
              value={perfectSunday}
              onChange={(event) =>
                setPerfectSunday(
                  event.target.value
                )
              }
            />

            <label htmlFor="green-flag">
              My biggest green flag
            </label>

            <textarea
              id="green-flag"
              rows={3}
              value={greenFlag}
              onChange={(event) =>
                setGreenFlag(
                  event.target.value
                )
              }
            />

            <label htmlFor="absolute-no">
              Absolutely not
            </label>

            <textarea
              id="absolute-no"
              rows={3}
              value={absoluteNo}
              onChange={(event) =>
                setAbsoluteNo(
                  event.target.value
                )
              }
            />
          </div>

          <button
            className="primary"
            type="submit"
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : saved
                ? 'Saved ✓'
                : 'Save changes'}
          </button>

          {error && (
            <p className="error">
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
