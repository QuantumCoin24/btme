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
