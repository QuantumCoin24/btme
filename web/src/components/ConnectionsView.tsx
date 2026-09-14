import type {
  MemberConnection
} from '../features/connections/connections'

type Props = {
  connections: MemberConnection[]
  loading: boolean
  onRefresh: () => void
  onOpenSpark: (
    connection: MemberConnection
  ) => void
  onOpenSafety: (
    connection: MemberConnection
  ) => void
}

export default function ConnectionsView({
  connections,
  loading,
  onRefresh,
  onOpenSpark,
  onOpenSafety
}: Props) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Connections
          </div>

          <h1 className="section-title">
            Your people.
          </h1>
        </div>

        <button
          className="secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          Loading connections…
        </div>
      ) : connections.length === 0 ? (
        <div className="empty-state">
          <h3>No connections yet.</h3>

          <p>
            When a Like is mutual,
            the connection appears here.
          </p>
        </div>
      ) : (
        <div className="connection-grid">
          {connections.map(
            (connection) => (
              <article
                className="connection-card"
                key={
                  connection.connectionId
                }
              >
                <button
                  className="connection-main-button"
                  type="button"
                  disabled={
                    !connection.conversationId
                  }
                  onClick={() =>
                    onOpenSpark(
                      connection
                    )
                  }
                >
                  <div className="connection-avatar">
                    {connection.photoUrl ? (
                      <img
                        src={
                          connection.photoUrl
                        }
                        alt=""
                      />
                    ) : (
                      <span>
                        {connection.displayName
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="connection-copy">
                    <h3>
                      {
                        connection.displayName
                      }
                    </h3>

                    {connection.compatibilityPercent !==
                      null && (
                      <p>
                        {Math.round(
                          connection.compatibilityPercent
                        )}% compatibility
                      </p>
                    )}

                    <div className="connection-badges">
                      {connection.verificationStatus ===
                        'verified' && (
                        <span className="verified">
                          Verified
                        </span>
                      )}

                      {connection.conversationId && (
                        <span className="spark-badge">
                          Spark™
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  className="connection-safety-button"
                  type="button"
                  onClick={() =>
                    onOpenSafety(
                      connection
                    )
                  }
                >
                  Safety
                </button>
              </article>
            )
          )}
        </div>
      )}
    </section>
  )
}
