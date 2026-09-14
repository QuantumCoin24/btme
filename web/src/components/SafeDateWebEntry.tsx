import {
  useCallback,
  useEffect,
  useState
} from 'react'

import type {
  DatePlan
} from '../features/dates/dates'

import {
  getSafeDateSession,
  type SafeDateSession
} from '../features/safedate/safeDate'

type Props = {
  plan: DatePlan
  onBack: () => void
}

function formatTimestamp(
  value: string | null
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date.toLocaleString(
    undefined,
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }
  )
}

function statusLabel(
  session: SafeDateSession | null
) {
  if (!session) {
    return 'Not started'
  }

  if (
    session.status === 'ended'
  ) {
    return 'Completed'
  }

  if (
    session.status ===
    'ended-by-me'
  ) {
    return 'Ended by you'
  }

  return 'Active'
}

export default function SafeDateWebEntry({
  plan,
  onBack
}: Props) {
  const [
    session,
    setSession
  ] = useState<SafeDateSession | null>(
    null
  )

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    error,
    setError
  ] = useState<string | null>(
    null
  )

  const load =
    useCallback(async () => {
      setLoading(true)
      setError(null)

      try {
        const next =
          await getSafeDateSession(
            plan.id
          )

        setSession(next)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load SafeDate™.'
        )
      } finally {
        setLoading(false)
      }
    }, [plan.id])

  useEffect(() => {
    void load()

    const timer =
      window.setInterval(
        () => {
          void load()
        },
        15000
      )

    return () => {
      window.clearInterval(
        timer
      )
    }
  }, [load])

  return (
    <section className="safedate-entry">
      <div className="safedate-toolbar">
        <button
          className="secondary"
          type="button"
          onClick={onBack}
        >
          Back to dates
        </button>

        <button
          className="secondary"
          type="button"
          onClick={() =>
            void load()
          }
          disabled={loading}
        >
          {loading
            ? 'Refreshing…'
            : 'Refresh status'}
        </button>
      </div>

      <div className="safedate-panel">
        <div className="eyebrow">
          SafeDate™
        </div>

        <h1>
          Your date.
          <br />
          Your safety.
        </h1>

        <p>
          This page reads the same
          SafeDate™ session authority
          used by the BTME™ iPhone app.
        </p>

        <div className="safedate-status-hero">
          <span>
            Session status
          </span>

          <strong
            className={
              session?.status === 'active'
                ? 'safe-status active'
                : 'safe-status'
            }
          >
            {loading
              ? 'Checking…'
              : statusLabel(
                  session
                )}
          </strong>
        </div>

        <div className="safedate-summary">
          <div>
            <span>
              Place
            </span>

            <strong>
              {plan.placeName}
            </strong>
          </div>

          <div>
            <span>
              Date status
            </span>

            <strong>
              {plan.status}
            </strong>
          </div>

          <div>
            <span>
              SafeDate started
            </span>

            <strong>
              {session
                ? formatTimestamp(
                    session.startedAt
                  )
                : 'Not started'}
            </strong>
          </div>

          <div>
            <span>
              Your side ended
            </span>

            <strong>
              {session?.myEndedAt
                ? formatTimestamp(
                    session.myEndedAt
                  )
                : 'No'}
            </strong>
          </div>

          <div>
            <span>
              Other side ended
            </span>

            <strong>
              {session?.theirEndedAt
                ? formatTimestamp(
                    session.theirEndedAt
                  )
                : 'No'}
            </strong>
          </div>

          <div>
            <span>
              Session closed
            </span>

            <strong>
              {session?.closedAt
                ? formatTimestamp(
                    session.closedAt
                  )
                : 'No'}
            </strong>
          </div>
        </div>

        {!session && (
          <div className="safedate-device-card">
            <div>
              <div className="eyebrow">
                Start SafeDate™
              </div>

              <h3>
                Continue on your iPhone.
              </h3>

              <p>
                Starting a SafeDate™
                requires BTME's
                installation-authority
                credential. We are keeping
                that security boundary intact.
              </p>
            </div>

            <span
              className="device-lock"
              aria-hidden="true"
            >
              ◉
            </span>
          </div>
        )}

        {session?.status ===
          'active' && (
          <div className="safedate-live-card">
            <div className="safe-live-dot" />

            <div>
              <strong>
                SafeDate™ is active.
              </strong>

              <p>
                This web view will refresh
                automatically every
                15 seconds.
              </p>
            </div>
          </div>
        )}

        {session &&
          session.status !==
            'ended' && (
          <div className="safedate-device-card">
            <div>
              <div className="eyebrow">
                End session
              </div>

              <h3>
                Use the BTME™ app.
              </h3>

              <p>
                Ending your side of a
                SafeDate™ is also protected
                by installation authority.
              </p>
            </div>

            <span
              className="device-lock"
              aria-hidden="true"
            >
              ◉
            </span>
          </div>
        )}

        <div className="safedate-security-note">
          <strong>
            Why isn't this button copied
            directly to the browser?
          </strong>

          <p>
            SafeDate™ start and end
            operations require a separate
            installation ID and secret.
            BTME™ does not weaken that
            safety control simply to make
            the web version look complete.
          </p>
        </div>

        <div className="safedate-emergency">
          <strong>
            In immediate danger?
          </strong>

          <p>
            BTME™ is not an emergency
            service. Contact the emergency
            services for your location.
          </p>
        </div>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
