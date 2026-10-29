import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface ApplicationUser {
  id: string
  name: string
  email: string
}

export interface AuthContextValue {
  session: Session | null
  user: ApplicationUser | null
  loading: boolean
  provisioning: boolean
  authError: string
  provisioningError: string
  dataMode: 'demo' | 'api'
  signUp: (name: string, email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  retryProvisioning: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
