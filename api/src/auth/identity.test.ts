import { describe, expect, it, vi } from 'vitest'
import { resolveInternalUser, verifySupabaseBearer } from './identity.js'

const confirmedIdentity = {
  id: 'auth-user-1',
  email: 'alex@example.test',
  email_confirmed_at: '2026-10-28T10:00:00.000Z',
}

describe('Supabase bearer verification', () => {
  it('rejects missing and malformed authorization headers without contacting Supabase', async () => {
    const getUser = vi.fn()
    expect(await verifySupabaseBearer(undefined, { getUser })).toMatchObject({ ok: false, status: 401 })
    expect(await verifySupabaseBearer('Basic token', { getUser })).toMatchObject({ ok: false, status: 401 })
    expect(getUser).not.toHaveBeenCalled()
  })

  it('rejects invalid and expired bearer tokens', async () => {
    const verifier = { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { status: 401 } }) }
    const result = await verifySupabaseBearer('Bearer expired-token', verifier)
    expect(result).toMatchObject({ ok: false, status: 401, code: 'UNAUTHORIZED' })
    expect(verifier.getUser).toHaveBeenCalledWith('expired-token')
  })

  it('requires confirmed email before accepting identity', async () => {
    const verifier = { getUser: vi.fn().mockResolvedValue({ data: { user: { ...confirmedIdentity, email_confirmed_at: null, confirmed_at: null } }, error: null }) }
    expect(await verifySupabaseBearer('Bearer valid-token', verifier)).toMatchObject({
      ok: false,
      status: 403,
      code: 'EMAIL_NOT_CONFIRMED',
    })
  })

  it('distinguishes upstream rate limiting and outage from rejected credentials', async () => {
    const limited = { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { status: 429 } }) }
    const outage = { getUser: vi.fn().mockRejectedValue(new Error('network unavailable')) }
    expect(await verifySupabaseBearer('Bearer token', limited)).toMatchObject({ ok: false, status: 429 })
    expect(await verifySupabaseBearer('Bearer token', outage)).toMatchObject({ ok: false, status: 503 })
  })

  it('resolves only the internal mapping for the verified Supabase UUID', async () => {
    const user = { id: 'cuid-user-1', email: 'alex@example.test', name: 'Alex' }
    const lookup = { findBySupabaseAuthId: vi.fn().mockResolvedValue(user), updateVerifiedEmail: vi.fn() }
    expect(await resolveInternalUser(confirmedIdentity, lookup)).toEqual({ ok: true, user })
    expect(lookup.findBySupabaseAuthId).toHaveBeenCalledWith('auth-user-1')
  })

  it('rejects a valid identity without a provisioned internal mapping', async () => {
    const lookup = { findBySupabaseAuthId: vi.fn().mockResolvedValue(null), updateVerifiedEmail: vi.fn() }
    expect(await resolveInternalUser(confirmedIdentity, lookup)).toMatchObject({
      ok: false,
      status: 403,
      code: 'ACCOUNT_NOT_PROVISIONED',
    })
  })

  it('updates a mapped email only from the verified identity and reports uniqueness conflicts', async () => {
    const user = { id: 'cuid-user-1', email: 'old@example.test', name: 'Alex' }
    const lookup = {
      findBySupabaseAuthId: vi.fn().mockResolvedValue(user),
      updateVerifiedEmail: vi.fn().mockRejectedValue({ code: 'P2002' }),
    }
    const result = await resolveInternalUser({ ...confirmedIdentity, email: 'new@example.test' }, lookup)
    expect(lookup.updateVerifiedEmail).toHaveBeenCalledWith(user.id, 'new@example.test')
    expect(result).toMatchObject({ ok: false, status: 409, code: 'ACCOUNT_MAPPING_CONFLICT' })
  })
})
