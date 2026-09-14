import { supabase } from '../../lib/supabase'

export async function deleteMyAccount() {
  const {
    data: { session },
    error: sessionError
  } =
    await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session) {
    throw new Error(
      'You must be signed in to delete your account.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'delete-account'
    )

  if (error) {
    throw error
  }

  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof data.error === 'string'
  ) {
    throw new Error(
      data.error
    )
  }

  await supabase.auth
    .signOut()
    .catch(() => undefined)

  return data
}
