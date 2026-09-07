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

import * as Linking from 'expo-linking'

import {
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase'

type PasswordAuthInput = {
  email: string
  password: string
}

type AuthContextValue = {
  configured: boolean
  initialized: boolean
  session: Session | null
  user: User | null
  signUpWithPassword: (
    input: PasswordAuthInput
  ) => Promise<void>
  signInWithPassword: (
    input: PasswordAuthInput
  ) => Promise<void>
  requestPasswordReset: (
    email: string
  ) => Promise<void>
  updatePassword: (
    password: string
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

function recoverySessionFromUrl(url: string) {
  const parsed = Linking.parse(url)
  const params = parsed.queryParams ?? {}

  const accessToken =
    typeof params.access_token === 'string'
      ? params.access_token
      : null

  const refreshToken =
    typeof params.refresh_token === 'string'
      ? params.refresh_token
      : null

  const type =
    typeof params.type === 'string'
      ? params.type
      : null

  if (
    type !== 'recovery' ||
    !accessToken ||
    !refreshToken
  ) {
    return null
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
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

    const handleRecoveryUrl = async (
      url: string | null
    ) => {
      if (!url) {
        return
      }

      const tokens =
        recoverySessionFromUrl(url)

      if (!tokens) {
        return
      }

      const { error } =
        await supabase.auth.setSession(tokens)

      if (error) {
        console.warn(
          '[BTME] Unable to establish recovery session:',
          error.message
        )
      }
    }

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

    void Linking.getInitialURL().then(
      handleRecoveryUrl
    )

    const linkSubscription =
      Linking.addEventListener(
        'url',
        ({ url }) => {
          void handleRecoveryUrl(url)
        }
      )

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
      linkSubscription.remove()
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      initialized,
      session,
      user: session?.user ?? null,

      signUpWithPassword: async ({
        email,
        password,
      }) => {
        requireConfiguration()

        const normalizedEmail =
          email.trim().toLowerCase()

        if (!normalizedEmail || !password) {
          throw new Error(
            'Email address and password are required.'
          )
        }

        const { data, error } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
          })

        if (error) {
          throw error
        }

        if (!data.session) {
          throw new Error(
            'Your account was created, but BTME could not start your session.'
          )
        }
      },

      signInWithPassword: async ({
        email,
        password,
      }) => {
        requireConfiguration()

        const normalizedEmail =
          email.trim().toLowerCase()

        if (!normalizedEmail || !password) {
          throw new Error(
            'Email address and password are required.'
          )
        }

        const { error } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })

        if (error) {
          throw error
        }
      },

      requestPasswordReset: async (
        email
      ) => {
        requireConfiguration()

        const normalizedEmail =
          email.trim().toLowerCase()

        if (!normalizedEmail) {
          throw new Error(
            'Email address is required.'
          )
        }

        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              normalizedEmail,
              {
                redirectTo:
                  'btme://reset-password',
              }
            )

        if (error) {
          throw error
        }
      },

      updatePassword: async (
        password
      ) => {
        requireConfiguration()

        if (password.length < 8) {
          throw new Error(
            'Password must be at least 8 characters.'
          )
        }

        const { error } =
          await supabase.auth.updateUser({
            password,
          })

        if (error) {
          throw error
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
