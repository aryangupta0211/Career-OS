import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.dataMode === 'demo') return children
  if (!isSupabaseConfigured) {
    return <section className="auth-gate"><h1>Authentication setup required</h1><p>Configure the public Supabase URL and publishable key before using API mode.</p><a className="button button-primary" href="/auth/login">Open sign in</a></section>
  }
  if (auth.loading) return <div className="route-loading" role="status">Restoring your secure session…</div>
  if (!auth.session) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  if (auth.provisioning) return <div className="route-loading" role="status">Preparing your workspace…</div>
  if (auth.provisioningError) {
    return <section className="auth-gate" role="alert">
      <h1>We could not verify your CareerOS account</h1>
      <p>{auth.provisioningError}</p>
      <div className="auth-gate-actions">
        <button className="button button-primary" onClick={auth.retryProvisioning}>Try again</button>
        <button className="button button-secondary" onClick={() => { void auth.signOut() }}>Sign out</button>
      </div>
    </section>
  }
  if (!auth.user) return <div className="route-loading" role="status">Verifying your account…</div>
  return children
}
