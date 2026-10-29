// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoCareerDataProvider } from '../context/CareerData'
import { CareerDataContext, type CareerDataContextValue } from '../context/careerDataContext'
import { AuthContext, type AuthContextValue } from '../context/auth-context'
import { ThemeProvider } from '../context/ThemeProvider'
import { demoData } from '../data/demo'
import { AppShell } from './AppShell'

afterEach(cleanup)

function renderShell(auth: AuthContextValue, dataError?: string) {
  const content = (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/auth/login" element={<p>Signed-out screen</p>} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<p>Workspace contents</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
  const failedData: CareerDataContextValue = {
    data: demoData,
    dataLoading: false,
    dataError: dataError ?? '',
    dataRetryLabel: 'Try again',
    retryDataLoad: vi.fn(),
    addRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
    toggleTask: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={auth}>
      <ThemeProvider>
        {dataError
          ? <CareerDataContext.Provider value={failedData}>{content}</CareerDataContext.Provider>
          : <DemoCareerDataProvider>{content}</DemoCareerDataProvider>}
      </ThemeProvider>
    </AuthContext.Provider>,
  )
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: null,
    user: null,
    loading: false,
    provisioning: false,
    authError: '',
    provisioningError: '',
    dataMode: 'demo',
    signUp: vi.fn(),
    signIn: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    retryProvisioning: vi.fn(),
    ...overrides,
  }
}

describe('AppShell authentication menu', () => {
  it('offers sign-in and account creation when signed out in demo mode', () => {
    renderShell(authValue())
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Create account' })).toBeTruthy()
    expect(screen.getAllByText('Personal demo account').length).toBeGreaterThan(0)
  })

  it('shows the signed-in user and signs out to the signed-out screen', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderShell(authValue({
      session: { user: { id: 'auth-user-1' } } as NonNullable<AuthContextValue['session']>,
      user: { id: 'auth-user-1', name: 'Taylor Example', email: 'taylor@example.test' },
      signOut,
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    expect(screen.getAllByText('Taylor Example').length).toBeGreaterThan(0)
    expect(screen.getAllByText('taylor@example.test').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText('Signed-out screen')).toBeTruthy()
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('replaces workspace content with a clear error instead of showing stale metrics', () => {
    renderShell(authValue(), 'The database schema needs an update.')
    expect(screen.getByRole('alert').textContent).toContain('The database schema needs an update.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByText('Workspace contents')).toBeNull()
  })
})
