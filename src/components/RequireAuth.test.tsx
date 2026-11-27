// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'
import type { AuthContextValue } from '../context/auth-context'

const mockAuthValue = vi.hoisted(() => ({
  current: {} as AuthContextValue,
}))

vi.mock('../context/auth-context', () => ({
  useAuth: () => mockAuthValue.current,
}))

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
}))

describe('RequireAuth route gate', () => {
  beforeEach(() => {
    cleanup()
  })
  afterEach(cleanup)

  it('renders children when authenticated and provisioned', () => {
    mockAuthValue.current = {
      session: { user: { id: 'auth-1' } } as any,
      user: { id: 'cuid-1', name: 'Alex', email: 'alex@example.test' },
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: '',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      updateDisplayName: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <MemoryRouter>
        <RequireAuth><div>Protected workspace content</div></RequireAuth>
      </MemoryRouter>
    )
    expect(screen.getByText('Protected workspace content')).toBeTruthy()
  })

  it('renders actionable account conflict UI on ACCOUNT_MAPPING_CONFLICT', () => {
    mockAuthValue.current = {
      session: { user: { id: 'auth-1' } } as any,
      user: null,
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: 'We found an existing account that needs secure verification before it can be linked. Sign in using your original method or follow the account recovery instructions.',
      provisioningErrorCode: 'ACCOUNT_MAPPING_CONFLICT',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      updateDisplayName: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <MemoryRouter>
        <RequireAuth><div>Protected workspace content</div></RequireAuth>
      </MemoryRouter>
    )
    expect(screen.getByText('Account link conflict')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign in with original method' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })

  it('renders reconciliation message on ACCOUNT_DUPLICATE_CONFLICT', () => {
    mockAuthValue.current = {
      session: { user: { id: 'auth-1' } } as any,
      user: null,
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: 'Multiple accounts exist for this email address. Please contact support to reconcile your account data.',
      provisioningErrorCode: 'ACCOUNT_DUPLICATE_CONFLICT',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      updateDisplayName: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <MemoryRouter>
        <RequireAuth><div>Protected workspace content</div></RequireAuth>
      </MemoryRouter>
    )
    expect(screen.getByText('Account reconciliation required')).toBeTruthy()
    expect(screen.getByText('Multiple accounts exist for this email address. Please contact support to reconcile your account data.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })
})
