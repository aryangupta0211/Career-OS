// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: null as Session | null,
  listener: undefined as ((event: string, session: Session | null) => void) | undefined,
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
}))

vi.mock('../lib/supabase', () => ({
  getDataMode: () => 'demo',
  getSupabaseClient: () => Promise.resolve({ auth: mocks.auth }),
  isSupabaseConfigured: true,
}))

import { AuthProvider } from './AuthContext'
import { useAuth } from './auth-context'
import { AuthPage } from '../pages/AuthPage'

const testSession = {
  access_token: 'unit-test-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1_900_000_000,
  refresh_token: 'unit-test-refresh-token',
  user: {
    id: 'supabase-user-1',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Taylor Example' },
    aud: 'authenticated',
    created_at: '2026-10-28T00:00:00.000Z',
    email: 'taylor@example.test',
    role: 'authenticated',
  },
} satisfies Session

function SessionView() {
  const auth = useAuth()
  return <>
    <p>{auth.user?.name ?? 'No authenticated account'}</p>
    <p>{auth.user?.email ?? ''}</p>
    <button onClick={() => { void auth.signOut() }}>End session</button>
  </>
}

function renderAuth(initialPath: string) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/auth/signup" element={<AuthPage page="signup" />} />
            <Route path="/auth/login" element={<AuthPage page="login" />} />
            <Route path="/" element={<SessionView />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  cleanup()
  mocks.session = null
  mocks.listener = undefined
  mocks.auth.onAuthStateChange.mockReset().mockImplementation((listener: (event: string, session: Session | null) => void) => {
    mocks.listener = listener
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  afterEach(cleanup)
  mocks.auth.getSession.mockReset().mockImplementation(async () => ({ data: { session: mocks.session }, error: null }))
  mocks.auth.signUp.mockReset().mockResolvedValue({ data: { user: null }, error: null })
  mocks.auth.signInWithPassword.mockReset().mockImplementation(async () => {
    mocks.session = testSession
    mocks.listener?.('SIGNED_IN', testSession)
    return { data: { session: testSession, user: testSession.user }, error: null }
  })
  mocks.auth.signOut.mockReset().mockImplementation(async () => {
    mocks.session = null
    mocks.listener?.('SIGNED_OUT', null)
    return { error: null }
  })
  mocks.auth.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null })
  mocks.auth.updateUser.mockReset().mockResolvedValue({ data: { user: testSession.user }, error: null })
})

describe('Supabase AuthProvider session flows', () => {
  it('registers through Supabase and presents the email-confirmation step', async () => {
    const user = userEvent.setup()
    renderAuth('/auth/signup')
    await user.type(screen.getByLabelText('Your name'), 'Taylor Example')
    await user.type(screen.getByLabelText('Email'), 'taylor@example.test')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.type(screen.getByLabelText('Confirm password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Check your email for a confirmation link before signing in.')).toBeTruthy()
    expect(mocks.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'taylor@example.test',
      options: expect.objectContaining({
        emailRedirectTo: expect.stringMatching(/\/auth\/confirm$/),
        data: { full_name: 'Taylor Example' },
      }),
    }))
    expect(mocks.session).toBeNull()
  })

  it('logs in, restores the stored session after remount, and clears it on sign-out', async () => {
    const user = userEvent.setup()
    const firstRender = renderAuth('/auth/login')
    await user.type(screen.getByLabelText('Email'), 'taylor@example.test')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Taylor Example')).toBeTruthy()
    expect(screen.getByText('taylor@example.test')).toBeTruthy()
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'taylor@example.test',
      password: 'correct horse battery',
    })

    firstRender.unmount()
    renderAuth('/')
    expect(await screen.findByText('Taylor Example')).toBeTruthy()
    expect(mocks.auth.getSession).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'End session' }))
    await waitFor(() => expect(mocks.session).toBeNull())
    expect(await screen.findByText('No authenticated account')).toBeTruthy()
  })
})
