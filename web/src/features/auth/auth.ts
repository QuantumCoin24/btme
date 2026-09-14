import {
  isSupabaseConfigured,
  supabase
} from '../../lib/supabase'

function requireConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'BTME Web is awaiting Supabase configuration.'
    )
  }
}

export async function signUp(
  email: string,
  password: string
) {
  requireConfiguration()

  const normalizedEmail =
    email.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    throw new Error(
      'Email address and password are required.'
    )
  }

  if (password.length < 8) {
    throw new Error(
      'Password must be at least 8 characters.'
    )
  }

  const { data, error } =
    await supabase.auth.signUp({
      email: normalizedEmail,
      password
    })

  if (error) {
    throw error
  }

  if (!data.session) {
    throw new Error(
      'Your account was created, but BTME could not start your session.'
    )
  }
}

export async function signIn(
  email: string,
  password: string
) {
  requireConfiguration()

  const normalizedEmail =
    email.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    throw new Error(
      'Email address and password are required.'
    )
  }

  const { error } =
    await supabase.auth
      .signInWithPassword({
        email: normalizedEmail,
        password
      })

  if (error) {
    throw error
  }
}

export async function signOut() {
  requireConfiguration()

  const { error } =
    await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function requestPasswordReset(
  email: string
) {
  requireConfiguration()

  const normalizedEmail =
    email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error(
      'Email address is required.'
    )
  }

  const redirectTo =
    `${window.location.origin}/app/`

  const { error } =
    await supabase.auth
      .resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      )

  if (error) {
    throw error
  }
}

export async function updatePassword(
  password: string
) {
  requireConfiguration()

  if (password.length < 8) {
    throw new Error(
      'Password must be at least 8 characters.'
    )
  }

  const { error } =
    await supabase.auth.updateUser({
      password
    })

  if (error) {
    throw error
  }
}
