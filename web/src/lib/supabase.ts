import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL as string | undefined

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey
)

const unavailableUrl =
  'https://example.invalid'

const unavailableKey =
  'btme-web-unconfigured'

export const supabase = createClient(
  supabaseUrl ?? unavailableUrl,
  supabasePublishableKey ?? unavailableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)
