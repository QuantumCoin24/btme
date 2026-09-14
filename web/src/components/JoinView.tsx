import {
  FormEvent,
  useState
} from 'react'

import {
  signUp
} from '../features/auth/auth'

type Props = {
  onCreated: () => void
  onSignIn: () => void
}

export default function JoinView({
  onCreated,
  onSignIn
}: Props) {
  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [confirmation, setConfirmation] =
    useState('')

  const [working, setWorking] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

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
      await signUp(
        email,
        password
      )

      onCreated()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to create your BTME™ account.'
      )
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="join-shell">
      <div className="eyebrow">
        Join BTME™
      </div>

      <h1>
        Better dating
        <br />
        starts here.
      </h1>

      <p className="join-copy">
        Create one BTME™ account
        for the app and the web.
      </p>

      <form
        className="card auth-card"
        onSubmit={submit}
      >
        <label htmlFor="join-email">
          Email
        </label>

        <input
          id="join-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
        />

        <label htmlFor="join-password">
          Password
        </label>

        <input
          id="join-password"
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

        <label htmlFor="join-confirmation">
          Confirm password
        </label>

        <input
          id="join-confirmation"
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
            !email ||
            !password ||
            !confirmation
          }
        >
          {working
            ? 'Creating account…'
            : 'Create BTME™ account'}
        </button>

        <button
          className="join-signin"
          type="button"
          onClick={onSignIn}
        >
          Already have an account?
          Sign in
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
