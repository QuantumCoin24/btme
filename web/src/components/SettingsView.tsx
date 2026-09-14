import {
  FormEvent,
  useState
} from 'react'

import type {
  Session
} from '@supabase/supabase-js'

import type {
  MemberAccessState
} from '../features/access/memberAccess'

import {
  requestPasswordReset,
  updatePassword
} from '../features/auth/auth'

import {
  deleteMyAccount
} from '../features/account/account'

type Props = {
  session: Session
  access: MemberAccessState | null
  onDeleted: () => void
}

export default function SettingsView({
  session,
  access,
  onDeleted
}: Props) {
  const [
    newPassword,
    setNewPassword
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState('')

  const [
    working,
    setWorking
  ] = useState(false)

  const [
    deleting,
    setDeleting
  ] = useState(false)

  const [
    error,
    setError
  ] = useState<string | null>(null)

  const [
    success,
    setSuccess
  ] = useState<string | null>(null)

  async function sendReset() {
    const email =
      session.user.email ?? ''

    if (!email) {
      setError(
        'No email address is available for this account.'
      )
      return
    }

    setWorking(true)
    setError(null)
    setSuccess(null)

    try {
      await requestPasswordReset(
        email
      )

      setSuccess(
        'Password reset email sent.'
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to send password reset email.'
      )
    } finally {
      setWorking(false)
    }
  }

  async function changePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError(null)
    setSuccess(null)

    if (
      !newPassword ||
      !confirmPassword
    ) {
      setError(
        'Enter and confirm your new password.'
      )
      return
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        'The passwords do not match.'
      )
      return
    }

    setWorking(true)

    try {
      await updatePassword(
        newPassword
      )

      setNewPassword('')
      setConfirmPassword('')

      setSuccess(
        'Your BTME™ password has been updated.'
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to update password.'
      )
    } finally {
      setWorking(false)
    }
  }

  async function removeAccount() {
    if (deleting) {
      return
    }

    const firstConfirmation =
      window.confirm(
        'Delete your BTME™ account permanently?\n\nThis cannot be undone.'
      )

    if (!firstConfirmation) {
      return
    }

    const secondConfirmation =
      window.confirm(
        'Important: deleting your BTME™ account does NOT automatically cancel an Apple subscription.\n\nCancel any active Apple subscription separately through your Apple account.\n\nContinue with account deletion?'
      )

    if (!secondConfirmation) {
      return
    }

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      await deleteMyAccount()

      onDeleted()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to delete your account.'
      )

      setDeleting(false)
    }
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Settings
          </div>

          <h1 className="section-title">
            Your account.
            <br />
            Your control.
          </h1>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-column">
          <section className="settings-card">
            <div className="eyebrow">
              Account
            </div>

            <h2>
              Sign-in details
            </h2>

            <div className="setting-row">
              <span>
                Email
              </span>

              <strong>
                {session.user.email ??
                  'Unavailable'}
              </strong>
            </div>

            <button
              className="settings-button"
              type="button"
              disabled={working}
              onClick={() =>
                void sendReset()
              }
            >
              Send password reset email
            </button>
          </section>

          <form
            className="settings-card"
            onSubmit={changePassword}
          >
            <div className="eyebrow">
              Security
            </div>

            <h2>
              Change password
            </h2>

            <label htmlFor="new-password">
              New password
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
            />

            <label htmlFor="confirm-password">
              Confirm password
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />

            <button
              className="primary"
              type="submit"
              disabled={working}
            >
              {working
                ? 'Updating…'
                : 'Update password'}
            </button>
          </form>
        </div>

        <div className="settings-column">
          <section className="settings-card premium-settings-card">
            <div className="eyebrow">
              BTME Premium
            </div>

            <h2>
              Membership
            </h2>

            <div className="setting-row">
              <span>
                Tier
              </span>

              <strong>
                {access?.entitlementTier ??
                  'none'}
              </strong>
            </div>

            <div className="setting-row">
              <span>
                Status
              </span>

              <strong>
                {access?.entitlementStatus ??
                  'inactive'}
              </strong>
            </div>

            <div className="setting-row">
              <span>
                Server verified
              </span>

              <strong>
                {access?.entitlementVerifiedAt
                  ? 'Yes'
                  : 'No'}
              </strong>
            </div>

            <p className="settings-copy">
              BTME Premium purchased on
              iPhone is managed through
              Apple. Subscription changes
              and cancellation are handled
              through your Apple account.
            </p>
          </section>

          <section className="settings-card">
            <div className="eyebrow">
              Help & legal
            </div>

            <h2>
              Support
            </h2>

            <div className="settings-links">
              <a href="/support/">
                Support Centre
              </a>

              <a href="/safety/">
                Safety Centre
              </a>

              <a href="/privacy/">
                Privacy Policy
              </a>

              <a href="/terms/">
                Terms of Use
              </a>

              <a href="/guidelines/">
                Community Guidelines
              </a>

              <a href="/account-deletion/">
                Account deletion information
              </a>

              <a
                href="mailto:csscpsg.enquiries@csscpsg.co.uk"
              >
                Contact BTME™
              </a>
            </div>
          </section>
        </div>
      </div>

      <section className="danger-zone">
        <div>
          <div className="eyebrow">
            Danger zone
          </div>

          <h2>
            Delete account
          </h2>

          <p>
            Permanently delete your
            BTME™ account and associated
            account data handled by the
            deletion service.
          </p>

          <p>
            <strong>
              Apple subscriptions are
              separate.
            </strong>
            {' '}
            Deleting your BTME™ account
            does not itself cancel an
            App Store subscription.
          </p>
        </div>

        <button
          className="delete-account-button"
          type="button"
          disabled={deleting}
          onClick={() =>
            void removeAccount()
          }
        >
          {deleting
            ? 'Deleting…'
            : 'Delete my account'}
        </button>
      </section>

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
    </section>
  )
}
