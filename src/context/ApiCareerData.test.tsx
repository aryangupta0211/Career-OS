// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from './auth-context'
import { ApiCareerDataProvider } from './ApiCareerData'
import { useCareerData } from './useCareerData'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function DataSnapshot() {
  const { data, dataError, dataLoading, retryDataLoad } = useCareerData()
  return <>
    {dataLoading && <p role="status">Loading workspace</p>}
    <p>Companies loaded: {data.companies.length}</p>
    {dataError && <p role="alert">{dataError}</p>}
    <button onClick={retryDataLoad}>Retry</button>
  </>
}

function MutationSnapshot() {
  const { data, dataError, dataRetryLabel, addRecord, retryDataLoad } = useCareerData()
  const addCompany = (name: string) => addRecord('company', {
    name, industry: '', location: '', website: '', size: '', tags: '',
    careersUrl: '', linkedinUrl: '', notes: '',
  })
  return <>
    <p>Companies: {data.companies.map(({ name }) => name).join(', ')}</p>
    {dataError && <p role="alert">{dataError}</p>}
    <button onClick={() => addCompany('Alpha')}>Add Alpha</button>
    <button onClick={() => addCompany('Beta')}>Add Beta</button>
    <button onClick={retryDataLoad}>{dataRetryLabel}</button>
  </>
}

describe('API career data provider', () => {
  it('surfaces API failures without falling back to demo records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured.' } }),
    }))
    const auth: AuthContextValue = {
      session: { access_token: 'test-token' } as NonNullable<AuthContextValue['session']>,
      user: { id: 'internal-user', name: 'Taylor', email: 'taylor@example.test' },
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: '',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <AuthContext.Provider value={auth}>
        <ApiCareerDataProvider><DataSnapshot /></ApiCareerDataProvider>
      </AuthContext.Provider>,
    )

    expect((await screen.findByRole('alert')).textContent).toContain('Authentication is not configured.')
    expect(screen.getByText('Companies loaded: 0')).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith('/api/data', {
      headers: { Authorization: 'Bearer test-token' },
    })
  })

  it('accepts legacy string errors and retries without treating failure as empty success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'An unexpected server error occurred.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          companies: [], applications: [], contacts: [], tasks: [], events: [], activities: [],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const auth: AuthContextValue = {
      session: { access_token: 'test-token' } as NonNullable<AuthContextValue['session']>,
      user: { id: 'internal-user', name: 'Taylor', email: 'taylor@example.test' },
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: '',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <AuthContext.Provider value={auth}>
        <ApiCareerDataProvider><DataSnapshot /></ApiCareerDataProvider>
      </AuthContext.Provider>,
    )

    expect((await screen.findByRole('alert')).textContent).toContain('An unexpected server error occurred.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Companies loaded: 0')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not replace newer workspace data with an older overlapping refresh', async () => {
    let resolveOlder!: (response: unknown) => void
    let resolveNewer!: (response: unknown) => void
    const olderRefresh = new Promise((resolve) => { resolveOlder = resolve })
    const newerRefresh = new Promise((resolve) => { resolveNewer = resolve })
    let loadCount = 0
    const emptyData = { companies: [], applications: [], contacts: [], tasks: [], events: [], activities: [] }
    const company = (id: string, name: string) => ({
      id, name, industry: '', location: '', website: '', size: '', tags: [],
      careersUrl: '', linkedinUrl: '', notes: '', createdAt: '2024-01-01T00:00:00.000Z',
    })
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve({ ok: true, status: 201 })
      loadCount += 1
      if (loadCount === 1) return Promise.resolve({ ok: true, json: async () => emptyData })
      return loadCount === 2 ? olderRefresh : newerRefresh
    })
    vi.stubGlobal('fetch', fetchMock)
    const auth: AuthContextValue = {
      session: { access_token: 'test-token' } as NonNullable<AuthContextValue['session']>,
      user: { id: 'internal-user', name: 'Taylor', email: 'taylor@example.test' },
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: '',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <AuthContext.Provider value={auth}>
        <ApiCareerDataProvider><MutationSnapshot /></ApiCareerDataProvider>
      </AuthContext.Provider>,
    )

    await waitFor(() => expect(loadCount).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Add Alpha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Beta' }))
    await waitFor(() => expect(loadCount).toBe(3))

    resolveNewer({
      ok: true,
      json: async () => ({ ...emptyData, companies: [company('alpha', 'Alpha'), company('beta', 'Beta')] }),
    })
    await waitFor(() => expect(screen.getByText('Companies: Alpha, Beta')).toBeTruthy())
    resolveOlder({
      ok: true,
      json: async () => ({ ...emptyData, companies: [company('alpha', 'Alpha')] }),
    })
    await waitFor(() => expect(screen.getByText('Companies: Alpha, Beta')).toBeTruthy())
  })

  it('retries a rejected write request rather than only reloading workspace data', async () => {
    let postCount = 0
    const emptyData = { companies: [], applications: [], contacts: [], tasks: [], events: [], activities: [] }
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postCount += 1
        return Promise.resolve(postCount === 1
          ? {
            ok: false,
            status: 400,
            json: async () => ({ error: { message: 'The record data is invalid.' } }),
          }
          : { ok: true, status: 201 })
      }
      return Promise.resolve({ ok: true, json: async () => emptyData })
    })
    vi.stubGlobal('fetch', fetchMock)
    const auth: AuthContextValue = {
      session: { access_token: 'test-token' } as NonNullable<AuthContextValue['session']>,
      user: { id: 'internal-user', name: 'Taylor', email: 'taylor@example.test' },
      loading: false,
      provisioning: false,
      authError: '',
      provisioningError: '',
      dataMode: 'api',
      signUp: vi.fn(),
      signIn: vi.fn(),
      requestPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
      signOut: vi.fn(),
      retryProvisioning: vi.fn(),
    }

    render(
      <AuthContext.Provider value={auth}>
        <ApiCareerDataProvider><MutationSnapshot /></ApiCareerDataProvider>
      </AuthContext.Provider>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Add Alpha' }))
    expect((await screen.findByRole('alert')).textContent).toContain('The record data is invalid.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry request' }))
    await waitFor(() => expect(postCount).toBe(2))
    expect(fetchMock).toHaveBeenCalledWith('/api/data/company', expect.objectContaining({ method: 'POST' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
