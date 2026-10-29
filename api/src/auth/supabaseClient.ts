import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config.js'

let client: SupabaseClient | undefined

export function getSupabaseAuthClient() {
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase authentication is not configured.')
  }
  if (!client) {
    client = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
