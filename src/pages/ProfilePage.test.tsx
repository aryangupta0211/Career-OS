// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/auth-context'
import { ProfilePage } from './ProfilePage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const profile = {
  displayName: 'Taylor Example',
  email: 'taylor@example.test',
  firstName: 'Taylor',
  lastName: 'Example',
  phone: '',
  location: 'Toronto',
  headline: 'Product designer',
  bio: 'Building thoughtful products.',
  currentRole: 'Product designer',
  skills: ['Research'],
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: {
      access_token: 'profile-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: 'auth-user',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { full_name: 'Taylor Example' },
        aud: 'authenticated',
        created_at: '2026-01-01T00:00:00.000Z',
        email: 'taylor@example.test',
        role: 'authenticated',
      },
    } as NonNullable<AuthContextValue['session']>,
    user: { id: 'auth-user', name: 'Taylor Example', email: 'taylor@example.test' },
    loading: false,
    provisioning: false,
    authError: '',
    provisioningError: '',
    dataMode: 'api',
    signUp: vi.fn(),
    signIn: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    updateDisplayName: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn(),
    retryProvisioning: vi.fn(),
    ...overrides,
  }
}

function renderProfile(auth = authValue()) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes><Route path="/profile" element={<ProfilePage />} /></Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProfilePage', () => {
  it('loads the authenticated profile, validates edits and saves to the profile API', async () => {
    const updatedProfile = { ...profile, displayName: 'Taylor E.', skills: ['Research', 'Prototyping'] }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: true, json: async () => updatedProfile })
    vi.stubGlobal('fetch', fetchMock)
    const auth = authValue()

    renderProfile(auth)
    expect(await screen.findByRole('heading', { name: 'Taylor Example' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText(/Display name/), { target: { value: 'Taylor E.' } })
    fireEvent.change(screen.getByLabelText(/Skills/), { target: { value: 'Research, Prototyping' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0])

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/profile', expect.objectContaining({
      method: 'PATCH',
      headers: { Authorization: 'Bearer profile-token', 'Content-Type': 'application/json' },
      body: expect.stringContaining('"skills":["Research","Prototyping"]'),
    }))
    expect(auth.updateDisplayName).toHaveBeenCalledWith('Taylor E.')
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Taylor E.' })).toBeTruthy()
  })

  it('does not send invalid profile links to the API', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => profile })
    vi.stubGlobal('fetch', fetchMock)
    renderProfile()
    await screen.findByRole('heading', { name: 'Taylor Example' })
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText(/LinkedIn URL/), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0])

    expect(await screen.findByText('Enter a valid LinkedIn URL.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
