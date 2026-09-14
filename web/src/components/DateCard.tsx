import type {
  DatePlan
} from '../features/dates/dates'

import type {
  MemberConnection
} from '../features/connections/connections'

type Props = {
  plan: DatePlan
  connection: MemberConnection | null
  onSafeDate: () => void
}

function formatDate(
  value: string
) {
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

export default function DateCard({
  plan,
  connection,
  onSafeDate
}: Props) {
  return (
    <article className="date-card">
      <div className="date-card-top">
        <div>
          <div className="eyebrow">
            {plan.status || 'Planned'}
          </div>

          <h3>
            {connection?.displayName ??
              'BTME™ date'}
          </h3>
        </div>

        <span className="date-heart">
          ♥
        </span>
      </div>

      <div className="date-detail">
        <span>When</span>
        <strong>
          {formatDate(
            plan.scheduledFor
          )}
        </strong>
      </div>

      <div className="date-detail">
        <span>Where</span>
        <strong>
          {plan.placeName}
        </strong>
      </div>

      <button
        className="date-safedate"
        type="button"
        onClick={onSafeDate}
      >
        Open SafeDate™
      </button>
    </article>
  )
}
