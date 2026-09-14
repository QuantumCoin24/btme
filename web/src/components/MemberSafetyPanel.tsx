import {
  FormEvent,
  useCallback,
  useEffect,
  useState
} from 'react'

import type {
  MemberConnection
} from '../features/connections/connections'

import {
  blockConnectionMember,
  getConnectionSafetyState,
  reportConnectionMember,
  unblockConnectionMember,
  type ConnectionSafetyState
} from '../features/safety/memberSafety'

type Props = {
  connection: MemberConnection
  onClose: () => void
  onChanged: () => void
}

const REPORT_CATEGORIES = [
  'harassment',
  'threatening-behaviour',
  'fake-profile',
  'scam',
  'sexual-misconduct',
  'hate-or-abuse',
  'underage-concern',
  'other'
]

function formatDate(
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

  return date.toLocaleString()
}

export default function MemberSafetyPanel({
  connection,
  onClose,
  onChanged
}: Props) {
  const [
    state,
    setState
  ] =
    useState<ConnectionSafetyState | null>(
      null
    )

  const [
    loading,
    setLoading
  ] =
    useState(true)

  const [
    working,
    setWorking
  ] =
    useState(false)

  const [
    category,
    setCategory
  ] =
    useState('')

  const [
    narrative,
    setNarrative
  ] =
    useState('')

  const [
    error,
    setError
  ] =
    useState<string | null>(
      null
    )

  const [
    success,
    setSuccess
  ] =
    useState<string | null>(
      null
    )

  const refresh =
    useCallback(async () => {
      setLoading(true)
      setError(null)

      try {
        const result =
          await getConnectionSafetyState(
            connection.connectionId
          )

        setState(result)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load safety status.'
        )
      } finally {
        setLoading(false)
      }
    }, [connection.connectionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function toggleBlock() {
    if (working) {
      return
    }

    const blocking =
      !state?.blockedByMe

    const confirmed =
      window.confirm(
        blocking
          ? `Block ${connection.displayName}?`
          : `Unblock ${connection.displayName}?`
      )

    if (!confirmed) {
      return
    }

    setWorking(true)
    setError(null)
    setSuccess(null)

    try {
      if (blocking) {
        await blockConnectionMember(
          connection.connectionId
        )
      } else {
        await unblockConnectionMember(
          connection.connectionId
        )
      }

      await refresh()

      setSuccess(
        blocking
          ? `${connection.displayName} is blocked.`
          : `${connection.displayName} is unblocked.`
      )

      onChanged()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to change block status.'
      )
    } finally {
      setWorking(false)
    }
  }

  async function submitReport(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      working ||
      !category ||
      !narrative.trim()
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Submit this report about ${connection.displayName}?`
      )

    if (!confirmed) {
      return
    }

    setWorking(true)
    setError(null)
    setSuccess(null)

    try {
      await reportConnectionMember(
        connection.connectionId,
        category,
        narrative
      )

      setCategory('')
      setNarrative('')

      await refresh()

      setSuccess(
        'Your safety report has been submitted.'
      )

      onChanged()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to submit report.'
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="safety-overlay">
      <section className="safety-dialog">
        <header className="safety-dialog-header">
          <div>
            <div className="eyebrow">
              Safety Centre
            </div>

            <h2>
              {connection.displayName}
            </h2>
          </div>

          <button
            className="secondary"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        {loading ? (
          <div className="empty-state">
            Checking safety status…
          </div>
        ) : (
          <>
            <div className="safety-status-grid">
              <div>
                <span>
                  Block status
                </span>

                <strong>
                  {state?.blockedByMe
                    ? 'Blocked'
                    : 'Not blocked'}
                </strong>
              </div>

              <div>
                <span>
                  Reports submitted
                </span>

                <strong>
                  {state?.reportCount ?? 0}
                </strong>
              </div>

              <div>
                <span>
                  Latest report
                </span>

                <strong>
                  {state?.latestReportCreatedAt
                    ? formatDate(
                        state.latestReportCreatedAt
                      )
                    : 'None'}
                </strong>
              </div>
            </div>

            <div className="safety-section">
              <h3>
                Block
              </h3>

              <p>
                Blocking is enforced by
                BTME™ on the server and
                affects this connection.
              </p>

              <button
                className={
                  state?.blockedByMe
                    ? 'safety-neutral-button'
                    : 'safety-danger-button'
                }
                type="button"
                disabled={working}
                onClick={() =>
                  void toggleBlock()
                }
              >
                {working
                  ? 'Working…'
                  : state?.blockedByMe
                    ? 'Unblock member'
                    : 'Block member'}
              </button>
            </div>

            <form
              className="safety-section"
              onSubmit={submitReport}
            >
              <h3>
                Report
              </h3>

              <p>
                Reports are private.
                Tell us what happened.
              </p>

              <label htmlFor="report-category">
                Category
              </label>

              <select
                id="report-category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Choose a category
                </option>

                {REPORT_CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item
                        .replaceAll('-', ' ')
                        .replace(
                          /^./,
                          (character) =>
                            character.toUpperCase()
                        )}
                    </option>
                  )
                )}
              </select>

              <label htmlFor="report-narrative">
                What happened?
              </label>

              <textarea
                id="report-narrative"
                rows={6}
                maxLength={4000}
                value={narrative}
                onChange={(event) =>
                  setNarrative(
                    event.target.value
                  )
                }
                placeholder="Give enough detail for the concern to be understood."
              />

              <div className="report-count">
                {narrative.length}
                /4000
              </div>

              <button
                className="safety-danger-button"
                type="submit"
                disabled={
                  working ||
                  !category ||
                  !narrative.trim()
                }
              >
                {working
                  ? 'Submitting…'
                  : 'Submit report'}
              </button>
            </form>
          </>
        )}

        {success && (
          <p className="success">
            {success}
          </p>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <div className="safety-emergency-note">
          <strong>
            Immediate danger?
          </strong>

          <p>
            BTME™ is not an emergency
            service. Contact emergency
            services for your location.
          </p>
        </div>
      </section>
    </div>
  )
}
