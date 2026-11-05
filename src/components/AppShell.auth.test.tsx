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
        <Route path="/profile" element={<p>Profile screen</p>} />
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
    updateDisplayName: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    retryProvisioning: vi.fn(),
    ...overrides,
  }
}

describe('AppShell authentication menu', () => {
  it('offers sign-in and account creation when signed out in demo mode', () => {
    renderShell(authValue())
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    expect(screen.getByRole('menuitem', { name: 'Sign in' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Create account' })).toBeTruthy()
    expect(screen.getAllByText('Browser-local demo').length).toBeGreaterThan(0)
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
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(await screen.findByText('Signed-out screen')).toBeTruthy()
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('replaces workspace content with a clear error instead of showing stale metrics', () => {
    renderShell(authValue(), 'The database schema needs an update.')
    expect(screen.getByRole('alert').textContent).toContain('The database schema needs an update.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByText('Workspace contents')).toBeNull()
  })

  it('toggles the profile menu, dismisses with Escape and keeps menus mutually exclusive', () => {
    renderShell(authValue())
    const profileTrigger = screen.getByRole('button', { name: 'Open profile menu' })
    fireEvent.click(profileTrigger)
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.click(profileTrigger)
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(profileTrigger)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add new' }))
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.click(profileTrigger)
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menuitem', { name: 'View profile' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'View profile' }))
    expect(screen.getByText('Profile screen')).toBeTruthy()
  })

  it('closes menus when clicking outside and retains a persisted sidebar toggle', () => {
    localStorage.clear()
    const firstRender = renderShell(authValue())
    const collapse = screen.getByRole('button', { name: 'Collapse sidebar' })
    fireEvent.click(collapse)
    expect(localStorage.getItem('careeros-sidebar-collapsed-v1')).toBe('true')
    firstRender.unmount()
    const restoredRender = renderShell(authValue())
    expect(restoredRender.container.querySelector('.app-shell')?.classList.contains('sidebar-collapsed')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open sidebar profile menu' }))
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull()
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
