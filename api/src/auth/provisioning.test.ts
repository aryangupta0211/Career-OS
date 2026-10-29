import { describe, expect, it } from 'vitest'
import { ProvisioningConflictError, provisionInternalUser } from './provisioning.js'

const identity = {
  id: 'auth-user-1',
  email: 'alex@example.test',
  email_confirmed_at: '2026-10-28T10:00:00.000Z',
  user_metadata: { full_name: 'Alex Carter' },
}

describe('internal user provisioning', () => {
  it('is idempotent for an existing Supabase identity mapping', async () => {
    const user = { id: 'cuid-existing', email: identity.email, name: 'Alex', supabaseAuthId: identity.id }
    let creates = 0
    const repository = {
      findBySupabaseAuthId: async () => user,
      create: async () => { creates += 1; return user },
      updateVerifiedEmail: async (_id: string, email: string) => ({ ...user, email }),
    }

    await expect(provisionInternalUser(identity, repository)).resolves.toEqual(user)
    expect(creates).toBe(0)
  })

  it('safely resolves concurrent duplicate provisioning to one internal user', async () => {
    const users = new Map<string, { id: string; email: string; name: string; supabaseAuthId: string }>()
    const repository = {
      findBySupabaseAuthId: async (id: string) => users.get(id) ?? null,
      create: async (input: { supabaseAuthId: string; email: string; name: string }) => {
        if ([...users.values()].some((user) => user.email === input.email)) throw { code: 'P2002' }
        const user = { ...input, id: 'cuid-created' }
        users.set(input.supabaseAuthId, user)
        return user
      },
      updateVerifiedEmail: async (id: string, email: string) => {
        const user = users.get(id)
        if (!user) throw new Error('missing test mapping')
        user.email = email
        return user
      },
    }

    const results = await Promise.all([
      provisionInternalUser(identity, repository),
      provisionInternalUser(identity, repository),
    ])
    expect(results[0]?.id).toBe('cuid-created')
    expect(results[1]?.id).toBe('cuid-created')
    expect(users.size).toBe(1)
  })

  it('does not link a verified identity to an existing account by matching email', async () => {
    const repository = {
      findBySupabaseAuthId: async () => null,
      create: async () => { throw { code: 'P2002' } },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'cuid-existing', email, name: 'Alex' }),
    }
    await expect(provisionInternalUser(identity, repository)).rejects.toBeInstanceOf(ProvisioningConflictError)
  })

  it('refuses to provision an unconfirmed or email-less identity', async () => {
    const repository = {
      findBySupabaseAuthId: async () => null,
      create: async () => { throw new Error('must not create') },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'id', email, name: 'Test' }),
    }
    await expect(provisionInternalUser({ ...identity, email_confirmed_at: null }, repository)).rejects.toThrow()
    await expect(provisionInternalUser({ ...identity, email: null }, repository)).rejects.toThrow()
  })
})
