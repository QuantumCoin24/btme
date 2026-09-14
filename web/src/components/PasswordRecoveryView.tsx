import {
  FormEvent,
  useState
} from 'react'

import {
  updatePassword
} from '../features/auth/auth'

type Props = {
  onComplete: () => void
}

export default function PasswordRecoveryView({
  onComplete
}: Props) {
  const [
    password,
    setPassword
  ] = useState('')

  const [
    confirmation,
    setConfirmation
  ] = useState('')

  const [
    working,
    setWorking
  ] = useState(false)

  const [
    error,
    setError
  ] = useState<string | null>(null)

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError(null)

    if (
      password !== confirmation
    ) {
      setError(
        'The passwords do not match.'
      )
      return
    }

    setWorking(true)

    try {
      await updatePassword(
        password
      )

      onComplete()
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

  return (
    <section className="recovery-shell">
      <div className="eyebrow">
        Account recovery
      </div>

      <h1>
        Choose a new
        <br />
        password.
      </h1>

      <form
        className="card auth-card"
        onSubmit={submit}
      >
        <label htmlFor="recovery-password">
          New password
        </label>

        <input
          id="recovery-password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
        />

        <label htmlFor="recovery-confirm">
          Confirm password
        </label>

        <input
          id="recovery-confirm"
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) =>
            setConfirmation(
              event.target.value
            )
          }
        />

        <button
          className="primary"
          type="submit"
          disabled={
            working ||
            !password ||
            !confirmation
          }
        >
          {working
            ? 'Updating…'
            : 'Set new password'}
        </button>

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
