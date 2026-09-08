import { supabase } from '../../lib/supabase'

type DeleteAccountResponse = {
  deleted?: boolean
  error?: string
}

export async function deleteMyAccount() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session) {
    throw new Error(
      'You must be signed in to delete your account.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke<DeleteAccountResponse>(
      'delete-account',
      {
        method: 'POST',
      }
    )

  if (error) {
    throw error
  }

  if (!data?.deleted) {
    throw new Error(
      data?.error ||
        'BTME could not confirm account deletion.'
    )
  }

  await supabase.auth.signOut({
    scope: 'local',
  })
}
