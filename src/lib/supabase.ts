import 'react-native-url-polyfill/auto'
import 'expo-sqlite/localStorage/install'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
)

if (
  __DEV__ &&
  (!supabaseUrl || !supabasePublishableKey)
) {
  console.info(
    '[BTME] Supabase client is awaiting local environment configuration.'
  )
}

const unavailableUrl = 'https://example.invalid'
const unavailableKey = 'btme-unconfigured'

export const supabase = createClient(
  supabaseUrl ?? unavailableUrl,
  supabasePublishableKey ?? unavailableKey,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
