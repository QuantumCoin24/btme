import type {
  DiscoveryIntroduction
} from '../features/discovery/discovery'

type Props = {
  introduction: DiscoveryIntroduction
  busy: boolean
  onLike: () => void
  onPass: () => void
}

export default function DiscoveryCard({
  introduction,
  busy,
  onLike,
  onPass
}: Props) {
  const primaryPhoto =
    introduction.photoUrls[0] ?? null

  return (
    <article className="discovery-card">
      <div className="discovery-photo">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt=""
          />
        ) : (
          <div className="photo-placeholder">
            BTME™
          </div>
        )}

        {introduction.compatibilityPercent !== null && (
          <div className="compatibility-badge">
            {Math.round(
              introduction.compatibilityPercent
            )}% match
          </div>
        )}
      </div>

      <div className="discovery-content">
        <div className="member-heading">
          <h2>
            {introduction.displayName}
            {introduction.age !== null
              ? `, ${introduction.age}`
              : ''}
          </h2>

          {introduction.verificationStatus ===
            'verified' && (
            <span className="verified">
              Verified
            </span>
          )}
        </div>

        {(introduction.city ||
          introduction.occupation) && (
          <p className="member-meta">
            {[
              introduction.city,
              introduction.occupation
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {introduction.bio && (
          <p className="member-bio">
            {introduction.bio}
          </p>
        )}

        {introduction.compatibilitySignals.length >
          0 && (
          <div className="signal-list">
            {introduction.compatibilitySignals.map(
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

        <div className="decision-row">
          <button
            className="decision-button pass"
            type="button"
            disabled={busy}
            onClick={onPass}
          >
            Pass
          </button>

          <button
            className="decision-button like"
            type="button"
            disabled={busy}
            onClick={onLike}
          >
            Like
          </button>
        </div>
      </div>
    </article>
  )
}
