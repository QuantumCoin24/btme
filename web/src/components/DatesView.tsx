import DateCard
  from './DateCard'

import DatePlanForm
  from './DatePlanForm'

import type {
  MemberConnection
} from '../features/connections/connections'

import type {
  DatePlan
} from '../features/dates/dates'

type Props = {
  plans: DatePlan[]
  connections: MemberConnection[]
  loading: boolean
  creating: boolean
  onRefresh: () => void
  onCreate: (
    connectionId: string,
    scheduledFor: string,
    placeName: string
  ) => Promise<void>
  onSafeDate: (
    plan: DatePlan
  ) => void
}

export default function DatesView({
  plans,
  connections,
  loading,
  creating,
  onRefresh,
  onCreate,
  onSafeDate
}: Props) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Dates
          </div>

          <h1 className="section-title">
            From chemistry
            <br />
            to real life.
          </h1>
        </div>

        <button
          className="secondary"
          type="button"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="dates-layout">
        <div>
          {loading ? (
            <div className="empty-state">
              Loading dates…
            </div>
          ) : plans.length === 0 ? (
            <div className="empty-state">
              <h3>
                No dates planned yet.
              </h3>

              <p>
                When you're ready,
                turn a connection into
                something real.
              </p>
            </div>
          ) : (
            <div className="date-list">
              {plans.map(
                (plan) => {
                  const connection =
                    connections.find(
                      (item) =>
                        item.connectionId ===
                        plan.connectionId
                    ) ?? null

                  return (
                    <DateCard
                      key={plan.id}
                      plan={plan}
                      connection={
                        connection
                      }
                      onSafeDate={() =>
                        onSafeDate(
                          plan
                        )
                      }
                    />
                  )
                }
              )}
            </div>
          )}
        </div>

        <DatePlanForm
          connections={connections}
          creating={creating}
          onCreate={onCreate}
        />
      </div>
    </section>
  )
}
