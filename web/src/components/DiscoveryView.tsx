import type {
  DiscoveryIntroduction
} from '../features/discovery/discovery'

import DiscoveryCard from './DiscoveryCard'

type Props = {
  introductions: DiscoveryIntroduction[]
  loading: boolean
  deciding: boolean
  onRefresh: () => void
  onLike: (
    introduction: DiscoveryIntroduction
  ) => void
  onPass: (
    introduction: DiscoveryIntroduction
  ) => void
}

export default function DiscoveryView({
  introductions,
  loading,
  deciding,
  onRefresh,
  onLike,
  onPass
}: Props) {
  const current =
    introductions[0] ?? null

  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Discover
          </div>

          <h1 className="section-title">
            Someone better
            <br />
            is out there.
          </h1>
        </div>

        <button
          className="secondary"
          onClick={onRefresh}
          disabled={loading || deciding}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          Finding introductions…
        </div>
      ) : !current ? (
        <div className="empty-state">
          <h3>You're caught up.</h3>
          <p>
            There are no new introductions
            available right now.
          </p>
        </div>
      ) : (
        <DiscoveryCard
          introduction={current}
          busy={deciding}
          onLike={() => onLike(current)}
          onPass={() => onPass(current)}
        />
      )}

      {introductions.length > 1 && (
        <p className="queue-count">
          {introductions.length - 1}
          {' '}
          more introduction
          {introductions.length - 1 === 1
            ? ''
            : 's'}
          {' '}
          ready
        </p>
      )}
    </section>
  )
}
