import type {
  AuthChangeEvent,
  Session,
  User,
} from '@supabase/supabase-js'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase'

type OtpChannel = 'email' | 'phone'

type RequestOtpInput = {
  channel: OtpChannel
  contact: string
}

type VerifyOtpInput = RequestOtpInput & {
  token: string
}

type AuthContextValue = {
  configured: boolean
  initialized: boolean
  session: Session | null
  user: User | null
  requestOtp: (
    input: RequestOtpInput
  ) => Promise<void>
  verifyOtp: (
    input: VerifyOtpInput
  ) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext =
  createContext<AuthContextValue | null>(null)

function requireConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'BTME authentication is not configured on this device.'
    )
  }
}

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [initialized, setInitialized] = useState(
    !isSupabaseConfigured
  )

  const [session, setSession] =
    useState<Session | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null)
      setInitialized(true)
      return
    }

    let active = true

    const initialize = async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession()

      if (!active) {
        return
      }

      if (error) {
        console.warn(
          '[BTME] Unable to restore Supabase session:',
          error.message
        )
      }

      setSession(data.session ?? null)
      setInitialized(true)
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (
        _event: AuthChangeEvent,
        nextSession: Session | null
      ) => {
        if (!active) {
          return
        }

        setSession(nextSession)
        setInitialized(true)
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      initialized,
      session,
      user: session?.user ?? null,

      requestOtp: async ({
        channel,
        contact,
      }) => {
        requireConfiguration()

        const normalized = contact.trim()

        if (!normalized) {
          throw new Error(
            'Enter your email address or phone number.'
          )
        }

        const result =
          channel === 'email'
            ? await supabase.auth.signInWithOtp({
                email: normalized,
                options: {
                  shouldCreateUser: true,
                },
              })
            : await supabase.auth.signInWithOtp({
                phone: normalized,
                options: {
                  shouldCreateUser: true,
                },
              })

        if (result.error) {
          throw result.error
        }
      },

      verifyOtp: async ({
        channel,
        contact,
        token,
      }) => {
        requireConfiguration()

        const normalizedContact = contact.trim()
        const normalizedToken = token.trim()

        if (!normalizedContact || !normalizedToken) {
          throw new Error(
            'Contact and verification code are required.'
          )
        }

        const result =
          channel === 'email'
            ? await supabase.auth.verifyOtp({
                email: normalizedContact,
                token: normalizedToken,
                type: 'email',
              })
            : await supabase.auth.verifyOtp({
                phone: normalizedContact,
                token: normalizedToken,
                type: 'sms',
              })

        if (result.error) {
          throw result.error
        }
      },

      signOut: async () => {
        requireConfiguration()

        const { error } =
          await supabase.auth.signOut()

        if (error) {
          throw error
        }
      },
    }),
    [initialized, session]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return value
}
