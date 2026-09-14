import {
  FormEvent,
  useCallback,
  useEffect,
  useState
} from 'react'

import type {
  Session
} from '@supabase/supabase-js'

import {
  isSupabaseConfigured,
  supabase
} from '../lib/supabase'

import {
  signIn,
  signOut
} from '../features/auth/auth'

import {
  describeAccessBlocker,
  getMyDatingAccessState,
  type MemberAccessState
} from '../features/access/memberAccess'

import {
  getDiscoveryIntroductions,
  recordMemberDecision,
  type DiscoveryIntroduction
} from '../features/discovery/discovery'

import {
  getMemberConnections,
  type MemberConnection
} from '../features/connections/connections'

import DiscoveryView
  from '../components/DiscoveryView'

import ConnectionsView
  from '../components/ConnectionsView'

import MatchMoment
  from '../components/MatchMoment'

import SparkView
  from '../components/SparkView'

import DatesView
  from '../components/DatesView'

import SafeDateWebEntry
  from '../components/SafeDateWebEntry'

import YouView
  from '../components/YouView'

import MemberSafetyPanel
  from '../components/MemberSafetyPanel'

import SettingsView
  from '../components/SettingsView'

import PasswordRecoveryView
  from '../components/PasswordRecoveryView'

import JoinView
  from '../components/JoinView'

import OnboardingView
  from '../components/OnboardingView'

import ProfilePhotosView
  from '../components/ProfilePhotosView'

import VerificationView
  from '../components/VerificationView'

import {
  getMemberDatePlans,
  createMemberDatePlan,
  type DatePlan
} from '../features/dates/dates'

type View =
  | 'home'
  | 'discover'
  | 'connections'
  | 'spark'
  | 'dates'
  | 'safedate'
  | 'you'
  | 'photos'
  | 'verify'
  | 'settings'

type MatchState = {
  name: string
  connectionId: string | null
}

export default function App() {
  const [session, setSession] =
    useState<Session | null>(null)

  const [initialized, setInitialized] =
    useState(false)

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [error, setError] =
    useState<string | null>(null)

  const [busy, setBusy] =
    useState(false)

  const [access, setAccess] =
    useState<MemberAccessState | null>(null)

  const [view, setView] =
    useState<View>('home')

  const [
    authMode,
    setAuthMode
  ] = useState<'signin' | 'join'>('signin')

  const [
    introductions,
    setIntroductions
  ] = useState<DiscoveryIntroduction[]>([])

  const [
    discoveryLoading,
    setDiscoveryLoading
  ] = useState(false)

  const [
    deciding,
    setDeciding
  ] = useState(false)

  const [
    connections,
    setConnections
  ] = useState<MemberConnection[]>([])

  const [
    connectionsLoading,
    setConnectionsLoading
  ] = useState(false)

  const [match, setMatch] =
    useState<MatchState | null>(null)

  const [
    activeConnection,
    setActiveConnection
  ] = useState<MemberConnection | null>(null)

  const [
    datePlans,
    setDatePlans
  ] = useState<DatePlan[]>([])

  const [
    datesLoading,
    setDatesLoading
  ] = useState(false)

  const [
    creatingDate,
    setCreatingDate
  ] = useState(false)

  const [
    activeDatePlan,
    setActiveDatePlan
  ] = useState<DatePlan | null>(null)

  const [
    safetyConnection,
    setSafetyConnection
  ] = useState<MemberConnection | null>(null)


  useEffect(() => {
    let active = true

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return

        setSession(
          data.session ?? null
        )

        setInitialized(true)
      })

    const {
      data: { subscription }
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!active) return

          setSession(nextSession)
          setInitialized(true)
        }
      )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setAccess(null)
      setIntroductions([])
      setConnections([])
      setView('home')
      return
    }

    void getMyDatingAccessState()
      .then(setAccess)
      .catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load BTME access.'
        )
      })
  }, [session?.user?.id])

  const loadDiscovery =
    useCallback(async () => {
      setDiscoveryLoading(true)
      setError(null)

      try {
        const result =
          await getDiscoveryIntroductions(20)

        setIntroductions(result)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load introductions.'
        )
      } finally {
        setDiscoveryLoading(false)
      }
    }, [])

  const loadDates =
    useCallback(async () => {
      setDatesLoading(true)
      setError(null)

      try {
        const result =
          await getMemberDatePlans()

        setDatePlans(result)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load dates.'
        )
      } finally {
        setDatesLoading(false)
      }
    }, [])

  const loadConnections =
    useCallback(async () => {
      setConnectionsLoading(true)
      setError(null)

      try {
        const result =
          await getMemberConnections()

        setConnections(result)
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load connections.'
        )
      } finally {
        setConnectionsLoading(false)
      }
    }, [])

  useEffect(() => {
    if (
      !session?.user ||
      view !== 'discover'
    ) {
      return
    }

    void loadDiscovery()
  }, [
    session?.user?.id,
    view,
    loadDiscovery
  ])

  useEffect(() => {
    if (
      !session?.user ||
      view !== 'connections'
    ) {
      return
    }

    void loadConnections()
  }, [
    session?.user?.id,
    view,
    loadConnections
  ])


  useEffect(() => {
    if (
      !session?.user ||
      view !== 'dates'
    ) {
      return
    }

    void Promise.all([
      loadDates(),
      loadConnections()
    ])
  }, [
    session?.user?.id,
    view,
    loadDates,
    loadConnections
  ])

  async function refreshAccess() {
    try {
      const next =
        await getMyDatingAccessState()

      setAccess(next)

      return next
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to refresh BTME access.'
      )

      return null
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setBusy(true)
    setError(null)

    try {
      await signIn(
        email,
        password
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to sign in.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function createDate(
    connectionId: string,
    scheduledFor: string,
    placeName: string
  ) {
    if (creatingDate) {
      return
    }

    setCreatingDate(true)
    setError(null)

    try {
      await createMemberDatePlan(
        connectionId,
        scheduledFor,
        placeName
      )

      await loadDates()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to create date.'
      )
    } finally {
      setCreatingDate(false)
    }
  }

  async function decide(
    introduction: DiscoveryIntroduction,
    decision: 'like' | 'pass'
  ) {
    if (deciding) {
      return
    }

    setDeciding(true)
    setError(null)

    try {
      const result =
        await recordMemberDecision(
          introduction.userId,
          decision
        )

      setIntroductions(
        (current) =>
          current.filter(
            (item) =>
              item.userId !==
              introduction.userId
          )
      )

      if (
        decision === 'like' &&
        result.matched
      ) {
        setMatch({
          name:
            introduction.displayName,
          connectionId:
            result.connectionId
        })

        void loadConnections()
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to record your decision.'
      )
    } finally {
      setDeciding(false)
    }
  }

  const isRecoveryPath =
    window.location.pathname ===
      '/app/reset-password' ||
    window.location.hash.includes(
      'type=recovery'
    )

  if (
    initialized &&
    isRecoveryPath &&
    session
  ) {
    return (
      <div className="btme-shell">
        <nav className="btme-nav">
          <div className="btme-brand">
            BTME<span>™</span>
          </div>
        </nav>

        <main className="btme-main">
          <PasswordRecoveryView
            onComplete={() => {
              window.history.replaceState(
                {},
                '',
                '/app/'
              )

              setView('settings')
            }}
          />
        </main>
      </div>
    )
  }

  if (!initialized) {
    return (
      <main className="btme-main">
        <p>Opening BTME™…</p>
      </main>
    )
  }

  return (
    <div className="btme-shell">
      <nav className="btme-nav">
        <button
          className="brand-button"
          type="button"
          onClick={() =>
            setView('home')
          }
        >
          <span className="btme-brand">
            BTME<span>™</span>
          </span>
        </button>

        {session && (
          <div className="nav-actions">
            <button
              className={
                view === 'discover'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('discover')
              }
            >
              Discover
            </button>

            <button
              className={
                view === 'connections'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('connections')
              }
            >
              Connections
            </button>


            <button
              className={
                view === 'dates'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('dates')
              }
            >
              Dates
            </button>


            <button
              className={
                view === 'you'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('you')
              }
            >
              You
            </button>

            <button
              className={
                view === 'verify'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('verify')
              }
            >
              Verify
            </button>


            <button
              className={
                view === 'photos'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('photos')
              }
            >
              Photos
            </button>


            <button
              className={
                view === 'settings'
                  ? 'nav-link active'
                  : 'nav-link'
              }
              onClick={() =>
                setView('settings')
              }
            >
              Settings
            </button>

            <button
              className="secondary"
              onClick={() =>
                void signOut()
              }
            >
              Sign out
            </button>
          </div>
        )}
      </nav>

      <main className="btme-main">
        {!session ? (
          authMode === 'join' ? (
            <JoinView
              onCreated={() => {
                setAuthMode('signin')
              }}
              onSignIn={() => {
                setAuthMode('signin')
              }}
            />
          ) : (
          <>
            <section className="hero">
              <div className="eyebrow">
                Better Than My Ex™
              </div>

              <h1>
                Dating with
                <br />
                standards.
              </h1>

              <p>
                One BTME™ account.
                One dating identity.
                Available across the app
                and the web.
              </p>
            </section>

            <form
              className="card auth-card"
              onSubmit={submit}
            >
              <h2>Welcome back.</h2>

              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
              />

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
              />

              <button
                className="primary"
                type="submit"
                disabled={
                  busy ||
                  !isSupabaseConfigured
                }
              >
                {busy
                  ? 'Signing in…'
                  : 'Enter BTME™'}
              </button>

              {!isSupabaseConfigured && (
                <p className="error">
                  BTME Web is awaiting
                  Supabase configuration.
                </p>
              )}

              {error && (
                <p className="error">
                  {error}
                </p>
              )}
              <button
                className="join-signin"
                type="button"
                onClick={() =>
                  setAuthMode('join')
                }
              >
                New to BTME™?
                Create an account
              </button>
            </form>
          </>
          )
        ) : access &&
          !access.profileComplete ? (
          <OnboardingView
            onComplete={() => {
              setView('photos')
              void refreshAccess()
            }}
          />
        ) : view === 'photos' ? (
          <ProfilePhotosView
            onDone={() => {
              if (
                access?.verificationStatus ===
                  'verified'
              ) {
                setView('home')
              } else {
                setView('verify')
              }
            }}
          />
        ) : view === 'verify' ? (
          <VerificationView
            access={access}
            onRefresh={async () => {
              await refreshAccess()
            }}
            onBack={() => {
              setView('home')
            }}
          />
        ) : view === 'discover' ? (
          <>
            <DiscoveryView
              introductions={
                introductions
              }
              loading={
                discoveryLoading
              }
              deciding={deciding}
              onRefresh={() =>
                void loadDiscovery()
              }
              onLike={(introduction) =>
                void decide(
                  introduction,
                  'like'
                )
              }
              onPass={(introduction) =>
                void decide(
                  introduction,
                  'pass'
                )
              }
            />

            {error && (
              <p className="error">
                {error}
              </p>
            )}
          </>
        ) : view === 'connections' ? (
          <>
            <ConnectionsView
              connections={connections}
              loading={
                connectionsLoading
              }
              onRefresh={() =>
                void loadConnections()
              }
              onOpenSpark={(connection) => {
                setActiveConnection(
                  connection
                )
                setView('spark')
              }}
              onOpenSafety={(connection) => {
                setSafetyConnection(
                  connection
                )
              }}
            />

            {error && (
              <p className="error">
                {error}
              </p>
            )}
          </>
        ) : view === 'spark' &&
          activeConnection ? (
          <SparkView
            connection={
              activeConnection
            }
            onBack={() => {
              setActiveConnection(null)
              setView('connections')
            }}
          />
        ) : view === 'dates' ? (
          <>
            <DatesView
              plans={datePlans}
              connections={connections}
              loading={datesLoading}
              creating={creatingDate}
              onRefresh={() =>
                void Promise.all([
                  loadDates(),
                  loadConnections()
                ])
              }
              onCreate={createDate}
              onSafeDate={(plan) => {
                setActiveDatePlan(
                  plan
                )
                setView(
                  'safedate'
                )
              }}
            />

            {error && (
              <p className="error">
                {error}
              </p>
            )}
          </>
        ) : view === 'safedate' &&
          activeDatePlan ? (
          <SafeDateWebEntry
            plan={activeDatePlan}
            onBack={() => {
              setActiveDatePlan(null)
              setView('dates')
            }}
          />
        ) : view === 'you' ? (
          <YouView
            verificationStatus={
              access?.verificationStatus ??
              null
            }
            membershipStatus={
              access?.entitlementStatus ??
              null
            }
          />
        ) : view === 'settings' ? (
          <SettingsView
            session={session}
            access={access}
            onDeleted={() => {
              setView('home')
            }}
          />
        ) : (
          <>
            <section className="hero">
              <div className="eyebrow">
                BTME™ Web
              </div>

              <h1>
                Welcome
                <br />
                back.
              </h1>

              <p>
                Your BTME™ account,
                membership and dating
                authority are shared with
                the iPhone app.
              </p>

              <div className="home-actions">
                <button
                  className="hero-action"
                  onClick={() =>
                    setView('discover')
                  }
                >
                  Start discovering
                </button>

                <button
                  className="hero-action secondary-action"
                  onClick={() =>
                    setView(
                      'connections'
                    )
                  }
                >
                  Your connections
                </button>


                <button
                  className="hero-action secondary-action"
                  onClick={() =>
                    setView(
                      'dates'
                    )
                  }
                >
                  Your dates
                </button>


                <button
                  className="hero-action secondary-action"
                  onClick={() =>
                    setView(
                      'you'
                    )
                  }
                >
                  Your profile
                </button>


                <button
                  className="hero-action secondary-action"
                  onClick={() =>
                    setView(
                      'settings'
                    )
                  }
                >
                  Settings
                </button>
              </div>
            </section>

            <section className="card">
              <div className="eyebrow">
                Account authority
              </div>

              <div className="status-grid">
                <div className="status">
                  <strong>
                    Identity
                  </strong>
                  <span className="status-value status-value-email">
                    {session.user.email ??
                      'Authenticated'}
                  </span>
                </div>

                <div className="status">
                  <strong>
                    Profile
                  </strong>
                  <span>
                    {access?.profileComplete
                      ? 'Complete'
                      : 'Incomplete'}
                  </span>
                </div>

                <div className="status">
                  <strong>
                    Membership
                  </strong>
                  <span>
                    {access
                      ?.entitlementStatus ??
                      'Not active'}
                  </span>
                </div>

                <div className="status">
                  <strong>
                    Verification
                  </strong>
                  <span>
                    {access
                      ?.verificationStatus ??
                      'Not verified'}
                  </span>
                </div>

                <div className="status">
                  <strong>
                    Dating access
                  </strong>
                  <span>
                    {access?.canDate
                      ? 'Enabled'
                      : describeAccessBlocker(access)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="error">
                  {error}
                </p>
              )}
            </section>
          </>
        )}
      </main>

      {safetyConnection && (
        <MemberSafetyPanel
          connection={safetyConnection}
          onClose={() =>
            setSafetyConnection(null)
          }
          onChanged={() => {
            void loadConnections()
          }}
        />
      )}

      {match && (
        <MatchMoment
          name={match.name}
          onContinue={() =>
            setMatch(null)
          }
          onConnections={() => {
            setMatch(null)
            setView('connections')
          }}
        />
      )}
    </div>
  )
}
