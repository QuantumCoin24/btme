import {
  FormEvent,
  useState
} from 'react'

import {
  completeWebOnboarding
} from '../features/onboarding/onboarding'

import {
  CHEMISTRY_OPTIONS,
  DEAL_BREAKER_OPTIONS,
  LIFESTYLE_OPTIONS,
  LOOKING_FOR_OPTIONS,
  RELATIONSHIP_OPTIONS,
  type ChemistryStyle,
  type DealBreaker,
  type LifestyleSignal,
  type MatchPreference,
  type RelationshipIntent
} from '../features/onboarding/options'

type Props = {
  onComplete: () => void
}

export default function OnboardingView({
  onComplete
}: Props) {
  const [firstName, setFirstName] =
    useState('')

  const [birthDate, setBirthDate] =
    useState('')

  const [city, setCity] =
    useState('')

  const [
    relationshipIntent,
    setRelationshipIntent
  ] =
    useState<RelationshipIntent | null>(
      null
    )

  const [
    lookingFor,
    setLookingFor
  ] =
    useState<MatchPreference | null>(
      null
    )

  const [minimumAge, setMinimumAge] =
    useState(18)

  const [maximumAge, setMaximumAge] =
    useState(60)

  const [distanceMiles, setDistanceMiles] =
    useState(25)

  const [
    lifestyleSignals,
    setLifestyleSignals
  ] =
    useState<LifestyleSignal[]>([])

  const [
    perfectSunday,
    setPerfectSunday
  ] = useState('')

  const [greenFlag, setGreenFlag] =
    useState('')

  const [absoluteNo, setAbsoluteNo] =
    useState('')

  const [
    chemistryStyle,
    setChemistryStyle
  ] =
    useState<ChemistryStyle | null>(
      null
    )

  const [
    dealBreakers,
    setDealBreakers
  ] =
    useState<DealBreaker[]>([])

  const [working, setWorking] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setWorking(true)
    setError(null)

    try {
      await completeWebOnboarding({
        firstName,
        birthDate,
        city,
        relationshipIntent:
          relationshipIntent ?? '',

        lookingFor:
          lookingFor
            ? [lookingFor]
            : [],
        minimumAge,
        maximumAge,
        distanceMiles,
        lifestyleSignals,
        perfectSunday,
        greenFlag,
        absoluteNo,
        chemistryStyle:
          chemistryStyle ?? '',

        dealBreakers
      })

      onComplete()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to complete onboarding.'
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Build your profile
          </div>

          <h1 className="section-title">
            Who are you,
            <br />
            really?
          </h1>
        </div>
      </div>

      <form
        className="onboarding-web"
        onSubmit={submit}
      >
        <section className="onboarding-section">
          <div className="eyebrow">
            The basics
          </div>

          <h2>
            Start with you
          </h2>

          <label htmlFor="ob-name">
            First name
          </label>

          <input
            id="ob-name"
            value={firstName}
            onChange={(event) =>
              setFirstName(
                event.target.value
              )
            }
          />

          <label htmlFor="ob-birth">
            Date of birth
          </label>

          <input
            id="ob-birth"
            type="date"
            value={birthDate}
            onChange={(event) =>
              setBirthDate(
                event.target.value
              )
            }
          />

          <p className="field-note">
            You must be 18 or over.
            Your date of birth becomes
            protected after onboarding.
          </p>

          <label htmlFor="ob-city">
            City
          </label>

          <input
            id="ob-city"
            value={city}
            onChange={(event) =>
              setCity(
                event.target.value
              )
            }
          />
        </section>

        <section className="onboarding-section">
          <div className="eyebrow">
            Intent
          </div>

          <h2>
            What are you here for?
          </h2>

          <label>
            Relationship intent
          </label>

          <div className="choice-card-grid">
            {RELATIONSHIP_OPTIONS.map(
              (option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    relationshipIntent ===
                    option.value
                      ? 'choice-card selected'
                      : 'choice-card'
                  }
                  onClick={() =>
                    setRelationshipIntent(
                      option.value
                    )
                  }
                >
                  <strong>
                    {option.title}
                  </strong>

                  <span>
                    {option.body}
                  </span>
                </button>
              )
            )}
          </div>

          <label>
            Looking for
          </label>

          <div className="choice-pill-row">
            {LOOKING_FOR_OPTIONS.map(
              (option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    lookingFor ===
                    option.value
                      ? 'choice-pill selected'
                      : 'choice-pill'
                  }
                  onClick={() =>
                    setLookingFor(
                      option.value
                    )
                  }
                >
                  {option.label}
                </button>
              )
            )}
          </div>

          <div className="profile-grid">
            <div>
              <label>
                Minimum age
              </label>

              <input
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
              <label>
                Maximum age
              </label>

              <input
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

          <label>
            Maximum distance
          </label>

          <div className="distance-control">
            <input
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
        </section>

        <section className="onboarding-section">
          <div className="eyebrow">
            Compatibility
          </div>

          <h2>
            Tell us what matters
          </h2>

          <label>
            Lifestyle signals
          </label>

          <div className="choice-pill-row">
            {LIFESTYLE_OPTIONS.map(
              (option) => {
                const selected =
                  lifestyleSignals.includes(
                    option.value
                  )

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      selected
                        ? 'choice-pill selected'
                        : 'choice-pill'
                    }
                    onClick={() =>
                      setLifestyleSignals(
                        (current) =>
                          selected
                            ? current.filter(
                                (value) =>
                                  value !==
                                  option.value
                              )
                            : [
                                ...current,
                                option.value
                              ]
                      )
                    }
                  >
                    {option.label}
                  </button>
                )
              }
            )}
          </div>

          <p className="field-note">
            {lifestyleSignals.length}
            {' '}
            selected — choose at least two.
          </p>

          <label>
            My perfect Sunday
          </label>

          <textarea
            rows={4}
            value={perfectSunday}
            onChange={(event) =>
              setPerfectSunday(
                event.target.value
              )
            }
          />

          <label>
            My biggest green flag
          </label>

          <textarea
            rows={4}
            value={greenFlag}
            onChange={(event) =>
              setGreenFlag(
                event.target.value
              )
            }
          />

          <label>
            Absolutely not
          </label>

          <textarea
            rows={4}
            value={absoluteNo}
            onChange={(event) =>
              setAbsoluteNo(
                event.target.value
              )
            }
          />

          <label>
            Chemistry style
          </label>

          <div className="choice-card-grid">
            {CHEMISTRY_OPTIONS.map(
              (option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    chemistryStyle ===
                    option.value
                      ? 'choice-card selected'
                      : 'choice-card'
                  }
                  onClick={() =>
                    setChemistryStyle(
                      option.value
                    )
                  }
                >
                  <strong>
                    {option.title}
                  </strong>

                  <span>
                    {option.body}
                  </span>
                </button>
              )
            )}
          </div>

          <label>
            Hard deal-breakers
          </label>

          <div className="choice-pill-row stacked">
            {DEAL_BREAKER_OPTIONS.map(
              (option) => {
                const selected =
                  dealBreakers.includes(
                    option.value
                  )

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      selected
                        ? 'choice-pill selected'
                        : 'choice-pill'
                    }
                    onClick={() =>
                      setDealBreakers(
                        (current) =>
                          selected
                            ? current.filter(
                                (value) =>
                                  value !==
                                  option.value
                              )
                            : [
                                ...current,
                                option.value
                              ]
                      )
                    }
                  >
                    {option.label}
                  </button>
                )
              }
            )}
          </div>

          <p className="field-note">
            Leaving all deal-breakers
            unselected is completely fine.
          </p>
        </section>

        <button
          className="primary onboarding-submit"
          type="submit"
          disabled={working}
        >
          {working
            ? 'Completing profile…'
            : 'Complete my BTME™ profile'}
        </button>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
