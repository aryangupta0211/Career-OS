import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

let clientPromise: Promise<SupabaseClient> | undefined

export function getSupabaseClient() {
  if (!isSupabaseConfigured) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable authentication.')
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }))
  }
  return clientPromise
}

export function getDataMode(): 'demo' | 'api' {
  const mode = import.meta.env.VITE_DATA_MODE ?? 'demo'
  if (mode !== 'demo' && mode !== 'api') throw new Error('VITE_DATA_MODE must be either "demo" or "api".')
  return mode
}
