import {
  useState
} from 'react'

import type {
  MemberAccessState
} from '../features/access/memberAccess'

type Props = {
  access: MemberAccessState | null
  onRefresh: () => Promise<void>
  onBack: () => void
}

function statusLabel(
  status:
    MemberAccessState['verificationStatus'] |
    undefined
) {
  switch (status) {
    case 'verified':
      return 'Live Selfie Verified'

    case 'pending':
      return 'Verification pending'

    case 'failed':
      return 'Verification unsuccessful'

    case 'needs_review':
      return 'Verification needs review'

    default:
      return 'Not verified'
  }
}

export default function VerificationView({
  access,
  onRefresh,
  onBack
}: Props) {
  const [
    refreshing,
    setRefreshing
  ] = useState(false)

  const verified =
    access?.verificationStatus ===
      'verified'

  async function refreshStatus() {
    if (refreshing) {
      return
    }

    setRefreshing(true)

    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <section className="verification-centre">
      <div className="eyebrow">
        BTME LIVE VERIFIED
      </div>

      <h1 className="section-title">
        Just you.
        <br />
        Just live.
      </h1>

      <p className="verification-intro">
        BTME™ Live Selfie Verified confirms
        that a member completed BTME™’s
        live-camera challenge.
      </p>

      <div
        className={
          verified
            ? 'verification-status-card verified'
            : 'verification-status-card'
        }
      >
        <div className="verification-status-mark">
          {verified ? '✓' : '◉'}
        </div>

        <div>
          <span className="verification-status-label">
            Verification status
          </span>

          <strong>
            {statusLabel(
              access?.verificationStatus
            )}
          </strong>

          {access?.verificationVerifiedAt && (
            <p>
              Verified{' '}
              {new Date(
                access.verificationVerifiedAt
              ).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {!verified && (
        <section className="verification-native-card">
          <div className="eyebrow">
            Live camera check
          </div>

          <h2>
            Complete verification on iPhone
          </h2>

          <p>
            BTME™ Live Selfie Verification
            currently uses the native iPhone
            verification engine. Open BTME™
            on your iPhone and choose Live
            Selfie Verification.
          </p>

          <p>
            The challenge asks you to look
            straight and turn your head
            through a short server-issued
            sequence.
          </p>

          <button
            className="primary"
            type="button"
            disabled={refreshing}
            onClick={() =>
              void refreshStatus()
            }
          >
            {refreshing
              ? 'Checking…'
              : 'I’ve completed it — refresh'}
          </button>
        </section>
      )}

      <section className="verification-privacy-card">
        <h3>
          Privacy by design
        </h3>

        <p>
          Verification frames are analysed
          on the device and deleted after
          analysis. BTME™ receives the
          challenge result and measurements
          required to validate the check.
        </p>
      </section>

      <section className="verification-authority-card">
        <h3>
          What Live Verified means
        </h3>

        <p>
          Live Selfie Verified confirms
          completion of BTME™’s live-camera
          challenge. It does not verify
          legal identity, name, date of birth
          or government-issued identification.
        </p>
      </section>

      <button
        className="join-signin"
        type="button"
        onClick={onBack}
      >
        Back
      </button>
    </section>
  )
}
