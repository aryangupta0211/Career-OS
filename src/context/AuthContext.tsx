import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { getDataMode, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'
import { AuthContext, type ApplicationUser, type AuthContextValue } from './auth-context'

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const dataMode = getDataMode()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState('')
  const [provisioned, setProvisioned] = useState<{ identityId: string; user: ApplicationUser } | null>(null)
  const [provisionFailure, setProvisionFailure] = useState<{ identityId: string; message: string } | null>(null)
  const [provisionAttempt, setProvisionAttempt] = useState(0)
  const currentIdentity = useRef<string | null>(null)
  const sessionIdentityId = session?.user.id
  const accessToken = session?.access_token

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true
    let unsubscribe: (() => void) | undefined
    const syncSession = (nextSession: Session | null) => {
      const identityId = nextSession?.user.id ?? null
      if (identityId !== currentIdentity.current) {
        queryClient.clear()
        setProvisioned(null)
        setProvisionFailure(null)
        currentIdentity.current = identityId
      }
      setSession(nextSession)
      setAuthError('')
      setLoading(false)
    }
    void getSupabaseClient().then(async (client) => {
      if (!active) return
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (active) syncSession(nextSession)
      })
      unsubscribe = () => subscription.unsubscribe()
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      if (active) syncSession(data.session)
    }).catch((error: unknown) => {
      if (!active) return
      setAuthError(messageOf(error))
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [queryClient])

  useEffect(() => {
    if (!sessionIdentityId || !accessToken || dataMode !== 'api' || !isSupabaseConfigured || provisioned?.identityId === sessionIdentityId) return

    let active = true
    void fetch('/api/auth/provision', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(async (response) => {
      const body: unknown = await response.json()
      if (!response.ok) {
        const apiMessage = typeof body === 'object' && body !== null && 'error' in body
          && typeof body.error === 'object' && body.error !== null && 'message' in body.error
          && typeof body.error.message === 'string'
          ? body.error.message
          : `Account setup failed (${response.status}).`
        throw new Error(apiMessage)
      }
      if (typeof body !== 'object' || body === null || !('user' in body) || typeof body.user !== 'object' || body.user === null) {
        throw new Error('The server returned an invalid account response.')
      }
      const candidate = body.user
      if (!('id' in candidate) || typeof candidate.id !== 'string'
        || !('name' in candidate) || typeof candidate.name !== 'string'
        || !('email' in candidate) || typeof candidate.email !== 'string') {
        throw new Error('The server returned an invalid account response.')
      }
      if (active) setProvisioned({
        identityId: sessionIdentityId,
        user: { id: candidate.id, name: candidate.name, email: candidate.email },
      })
    }).catch((error: unknown) => {
      if (active) setProvisionFailure({ identityId: sessionIdentityId, message: messageOf(error) })
    })
    return () => { active = false }
  }, [accessToken, dataMode, provisionAttempt, provisioned?.identityId, sessionIdentityId])

  const sessionEmail = session?.user.email ?? ''
  const metadataName = session?.user.user_metadata?.full_name
  const sessionName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : sessionEmail.split('@')[0] || 'CareerOS user'
  const sessionUser = session
    ? { id: session.user.id, name: sessionName, email: sessionEmail }
    : null
  const user = session && provisioned?.identityId === session.user.id
    ? provisioned.user
    : dataMode === 'demo' ? sessionUser : null
  const provisioningError = session && provisionFailure?.identityId === session.user.id ? provisionFailure.message : ''
  const provisioning = dataMode === 'api' && Boolean(session) && !user && !provisioningError

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    loading,
    provisioning,
    authError,
    provisioningError,
    dataMode,
    signUp: async (name, email, password) => {
      const client = await getSupabaseClient()
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: { full_name: name.trim() },
        },
      })
      if (error) throw error
    },
    signIn: async (email, password) => {
      const client = await getSupabaseClient()
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    requestPasswordReset: async (email) => {
      const client = await getSupabaseClient()
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/recovery`,
      })
      if (error) throw error
    },
    updatePassword: async (password) => {
      const client = await getSupabaseClient()
      const { error } = await client.auth.updateUser({ password })
      if (error) throw error
    },
    signOut: async () => {
      const client = await getSupabaseClient()
      const { error } = await client.auth.signOut()
      if (error) throw error
      queryClient.clear()
      setProvisioned(null)
      setProvisionFailure(null)
    },
    retryProvisioning: () => {
      setProvisionFailure(null)
      setProvisionAttempt((attempt) => attempt + 1)
    },
  }), [authError, dataMode, loading, provisioning, provisioningError, queryClient, session, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
