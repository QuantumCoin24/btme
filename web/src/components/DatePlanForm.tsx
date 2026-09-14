import {
  FormEvent,
  useMemo,
  useState
} from 'react'

import type {
  MemberConnection
} from '../features/connections/connections'

type Props = {
  connections: MemberConnection[]
  creating: boolean
  onCreate: (
    connectionId: string,
    scheduledFor: string,
    placeName: string
  ) => Promise<void>
}

export default function DatePlanForm({
  connections,
  creating,
  onCreate
}: Props) {
  const [connectionId, setConnectionId] =
    useState('')

  const [date, setDate] =
    useState('')

  const [time, setTime] =
    useState('')

  const [place, setPlace] =
    useState('')

  const selected =
    useMemo(
      () =>
        connections.find(
          (connection) =>
            connection.connectionId ===
            connectionId
        ) ?? null,
      [
        connections,
        connectionId
      ]
    )

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      !connectionId ||
      !date ||
      !time ||
      !place.trim()
    ) {
      return
    }

    await onCreate(
      connectionId,
      `${date}T${time}`,
      place
    )

    setDate('')
    setTime('')
    setPlace('')
  }

  return (
    <form
      className="date-form"
      onSubmit={submit}
    >
      <div className="eyebrow">
        Plan a date
      </div>

      <h2>
        From Spark™
        <br />
        to real life.
      </h2>

      <label htmlFor="date-connection">
        Connection
      </label>

      <select
        id="date-connection"
        value={connectionId}
        onChange={(event) =>
          setConnectionId(
            event.target.value
          )
        }
      >
        <option value="">
          Choose a connection
        </option>

        {connections.map(
          (connection) => (
            <option
              key={
                connection.connectionId
              }
              value={
                connection.connectionId
              }
            >
              {
                connection.displayName
              }
            </option>
          )
        )}
      </select>

      {selected && (
        <p className="date-selected">
          Planning with
          {' '}
          <strong>
            {selected.displayName}
          </strong>
        </p>
      )}

      <div className="date-grid">
        <div>
          <label htmlFor="date-day">
            Date
          </label>

          <input
            id="date-day"
            type="date"
            value={date}
            onChange={(event) =>
              setDate(
                event.target.value
              )
            }
          />
        </div>

        <div>
          <label htmlFor="date-time">
            Time
          </label>

          <input
            id="date-time"
            type="time"
            value={time}
            onChange={(event) =>
              setTime(
                event.target.value
              )
            }
          />
        </div>
      </div>

      <label htmlFor="date-place">
        Place
      </label>

      <input
        id="date-place"
        type="text"
        value={place}
        onChange={(event) =>
          setPlace(
            event.target.value
          )
        }
        placeholder="Where are you meeting?"
        maxLength={180}
      />

      <button
        className="primary"
        type="submit"
        disabled={
          creating ||
          !connectionId ||
          !date ||
          !time ||
          !place.trim()
        }
      >
        {creating
          ? 'Planning…'
          : 'Plan this date'}
      </button>
    </form>
  )
}
