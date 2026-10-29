import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { isSupabaseConfigured } from '../lib/supabase'

type AuthPageKind = 'login' | 'signup' | 'forgot-password' | 'recovery' | 'confirm'

const headings: Record<AuthPageKind, string> = {
  login: 'Welcome back',
  signup: 'Create your account',
  'forgot-password': 'Reset your password',
  recovery: 'Choose a new password',
  confirm: 'Confirm your email',
}

export function AuthPage({ page }: { page: AuthPageKind }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    setBusy(true)
    try {
      if (page === 'signup') {
        const name = String(form.get('name') ?? '').trim()
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        if (password !== String(form.get('confirmPassword') ?? '')) throw new Error('The passwords do not match.')
        await auth.signUp(name, email, password)
        setNotice('Check your email for a confirmation link before signing in.')
      } else if (page === 'login') {
        await auth.signIn(email, password)
        navigate('/', { replace: true })
      } else if (page === 'forgot-password') {
        await auth.requestPasswordReset(email)
        setNotice('If an account exists for that address, a password reset link is on its way.')
      } else if (page === 'recovery') {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        if (password !== String(form.get('confirmPassword') ?? '')) throw new Error('The passwords do not match.')
        await auth.updatePassword(password)
        setNotice('Your password has been updated. You can continue to your workspace.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const configured = isSupabaseConfigured
  const authReady = auth.loading ? <p className="auth-message" role="status">Restoring your session…</p> : null
  const showPasswordFields = page === 'signup' || page === 'login' || page === 'recovery'
  const returnToLogin = page !== 'login'

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-brand" to="/">careeros</Link>
        <p className="eyebrow">CAREEROS WORKSPACE</p>
        <h1 id="auth-title">{headings[page]}</h1>
        {page === 'confirm' ? (
          <div className="auth-message" role="status">
            {auth.loading ? 'Checking your confirmation…' : auth.session
              ? 'Your email is confirmed. You can continue to your workspace.'
              : 'Use the confirmation link sent to your email. If it has expired, request a new link by signing up again or contact support.'}
          </div>
        ) : page === 'recovery' && !auth.session && !auth.loading ? (
          <div className="auth-message" role="alert">
            This recovery link is invalid or expired. Request a new password reset link.
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            {page === 'signup' && <label className="form-field"><span>Your name</span><input name="name" autoComplete="name" required maxLength={100} /></label>}
            {(page === 'login' || page === 'signup' || page === 'forgot-password') && (
              <label className="form-field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
            )}
            {showPasswordFields && <label className="form-field"><span>Password</span><input name="password" type="password" autoComplete={page === 'login' ? 'current-password' : 'new-password'} required minLength={8} /></label>}
            {(page === 'signup' || page === 'recovery') && <label className="form-field"><span>Confirm password</span><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></label>}
            {!configured && <p className="auth-message" role="alert">Authentication is not configured. Set the public Supabase URL and publishable key in the frontend environment, and configure the same project in `api/.env`.</p>}
            {auth.authError && <p className="auth-error" role="alert">{auth.authError}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-message" role="status">{notice}</p>}
            {authReady}
            <button className="button button-primary auth-submit" type="submit" disabled={busy || !configured || auth.loading}>
              {busy ? 'Please wait…' : page === 'signup' ? 'Create account' : page === 'login' ? 'Sign in' : page === 'forgot-password' ? 'Send reset link' : 'Update password'}
            </button>
          </form>
        )}
        {page === 'confirm' && auth.session && <Link className="button button-primary auth-submit auth-link-button" to="/">Continue to CareerOS</Link>}
        {page === 'recovery' && !auth.session && !auth.loading && <Link className="button button-primary auth-submit auth-link-button" to="/auth/forgot-password">Request another link</Link>}
        <nav className="auth-links" aria-label="Authentication links">
          {returnToLogin && <Link to="/auth/login">Sign in</Link>}
          {page === 'login' && <Link to="/auth/forgot-password">Forgot password?</Link>}
          {page === 'login' && <Link to="/auth/signup">Create an account</Link>}
          {page === 'signup' && <Link to="/auth/login">Already have an account?</Link>}
          {page === 'forgot-password' && <Link to="/auth/signup">Create an account</Link>}
        </nav>
        {location.pathname.startsWith('/auth/') && auth.dataMode === 'demo' && (
          <p className="auth-demo-note">Demo mode is active. The existing browser-local workspace remains available.</p>
        )}
      </section>
    </main>
  )
}
