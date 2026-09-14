type Props = {
  name: string
  onContinue: () => void
  onConnections: () => void
}

export default function MatchMoment({
  name,
  onContinue,
  onConnections
}: Props) {
  return (
    <div className="match-overlay">
      <div className="match-panel">
        <div className="eyebrow">
          It's mutual
        </div>

        <div className="match-heart">
          ♥
        </div>

        <h2>
          You and {name}
          <br />
          have a Spark™.
        </h2>

        <p>
          The feeling is mutual.
          Your new connection is ready.
        </p>

        <button
          className="primary"
          onClick={onConnections}
        >
          View connection
        </button>

        <button
          className="match-secondary"
          onClick={onContinue}
        >
          Keep discovering
        </button>
      </div>
    </div>
  )
}
