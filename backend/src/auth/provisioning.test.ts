import { describe, expect, it } from 'vitest'
import { ProvisioningConflictError, ProvisioningDuplicateEmailError, provisionInternalUser } from './provisioning.js'

const identity = {
  id: 'auth-user-1',
  email: 'alex@example.test',
  email_confirmed_at: '2026-10-28T10:00:00.000Z',
  user_metadata: { full_name: 'Alex Carter' },
}

describe('internal user provisioning', () => {
  it('Case 1: is idempotent for an existing Supabase identity mapping', async () => {
    const user = { id: 'cuid-existing', email: identity.email, name: 'Alex', supabaseAuthId: identity.id }
    let creates = 0
    const repository = {
      findBySupabaseAuthId: async () => user,
      findDuplicatesByVerifiedEmail: async () => [user],
      findByVerifiedEmail: async () => user,
      linkSupabaseAuthId: async () => user,
      create: async () => { creates += 1; return user },
      updateVerifiedEmail: async (_id: string, email: string) => ({ ...user, email }),
    }

    await expect(provisionInternalUser(identity, repository)).resolves.toEqual(user)
    expect(creates).toBe(0)
  })

  it('Case 2: links a verified identity to a legacy account when it has no existing identity (null)', async () => {
    const legacyUser = { id: 'cuid-existing', email: identity.email!, name: 'Alex', supabaseAuthId: null }
    const repository = {
      findBySupabaseAuthId: async () => null,
      findDuplicatesByVerifiedEmail: async () => [legacyUser],
      findByVerifiedEmail: async () => legacyUser,
      linkSupabaseAuthId: async (id: string, supabaseAuthId: string) => ({ ...legacyUser, id, supabaseAuthId }),
      create: async () => { throw new Error('must not create') },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'cuid-existing', email, name: 'Alex' }),
    }
    await expect(provisionInternalUser(identity, repository)).resolves.toMatchObject({ id: 'cuid-existing', supabaseAuthId: identity.id })
  })

  it('Case 3: provisions a new internal user when neither mapping nor email exists', async () => {
    let created = false
    const repository = {
      findBySupabaseAuthId: async () => null,
      findDuplicatesByVerifiedEmail: async () => [],
      findByVerifiedEmail: async () => null,
      linkSupabaseAuthId: async () => { throw new Error('must not link') },
      create: async (input: { supabaseAuthId: string; email: string; name: string }) => {
        created = true
        return { ...input, id: 'cuid-new' }
      },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'cuid-new', email, name: 'Alex Carter' }),
    }
    const result = await provisionInternalUser(identity, repository)
    expect(created).toBe(true)
    expect(result).toMatchObject({ id: 'cuid-new', email: identity.email, supabaseAuthId: identity.id })
  })

  it('Case 4A: refuses to overwrite an existing account linked to another active Supabase identity', async () => {
    const repository = {
      findBySupabaseAuthId: async () => null,
      findDuplicatesByVerifiedEmail: async () => [{ id: 'cuid-existing', email: identity.email!, name: 'Alex', supabaseAuthId: 'active-other-id' }],
      findByVerifiedEmail: async () => ({ id: 'cuid-existing', email: identity.email!, name: 'Alex', supabaseAuthId: 'active-other-id' }),
      linkSupabaseAuthId: async () => { throw new Error('must not link') },
      create: async () => { throw new Error('must not create') },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'cuid-existing', email, name: 'Alex' }),
      isSupabaseAuthIdActive: async () => true,
    }
    await expect(provisionInternalUser(identity, repository)).rejects.toBeInstanceOf(ProvisioningConflictError)
  })

  it('Case 4B: rebinds an orphaned/deleted Supabase identity mapping when verified ownership is proven', async () => {
    const orphanUser = { id: 'cuid-existing', email: identity.email!, name: 'Alex', supabaseAuthId: 'orphaned-deleted-auth-id' }
    let reboundAuthId: string | undefined
    const repository = {
      findBySupabaseAuthId: async () => null,
      findDuplicatesByVerifiedEmail: async () => [orphanUser],
      findByVerifiedEmail: async () => orphanUser,
      linkSupabaseAuthId: async (id: string, supabaseAuthId: string, expectedCurrentAuthId?: string | null) => {
        expect(expectedCurrentAuthId).toBe('orphaned-deleted-auth-id')
        reboundAuthId = supabaseAuthId
        return { ...orphanUser, id, supabaseAuthId }
      },
      create: async () => { throw new Error('must not create') },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'cuid-existing', email, name: 'Alex' }),
      isSupabaseAuthIdActive: async (id: string) => id !== 'orphaned-deleted-auth-id',
    }
    const result = await provisionInternalUser(identity, repository)
    expect(reboundAuthId).toBe(identity.id)
    expect(result).toMatchObject({ id: 'cuid-existing', supabaseAuthId: identity.id })
  })

  it('Case 5: refuses to merge or guess when duplicate internal accounts match the email', async () => {
    const userA = { id: 'cuid-1', email: identity.email!, name: 'Alex A', supabaseAuthId: null }
    const userB = { id: 'cuid-2', email: identity.email!, name: 'Alex B', supabaseAuthId: null }
    const repository = {
      findBySupabaseAuthId: async () => null,
      findDuplicatesByVerifiedEmail: async () => [userA, userB],
      findByVerifiedEmail: async () => userA,
      linkSupabaseAuthId: async () => { throw new Error('must not link') },
      create: async () => { throw new Error('must not create') },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'cuid-1', email, name: 'Alex A' }),
    }
    await expect(provisionInternalUser(identity, repository)).rejects.toBeInstanceOf(ProvisioningDuplicateEmailError)
  })

  it('Case 6: safely resolves concurrent duplicate provisioning to one internal user', async () => {
    const users = new Map<string, { id: string; email: string; name: string; supabaseAuthId: string }>()
    const repository = {
      findBySupabaseAuthId: async (id: string) => users.get(id) ?? null,
      findDuplicatesByVerifiedEmail: async () => [],
      findByVerifiedEmail: async () => null,
      linkSupabaseAuthId: async () => { throw new Error('must not link') },
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

  it('refuses to provision an unconfirmed or email-less identity', async () => {
    const repository = {
      findBySupabaseAuthId: async () => null,
      findDuplicatesByVerifiedEmail: async () => [],
      findByVerifiedEmail: async () => null,
      linkSupabaseAuthId: async () => { throw new Error('must not link') },
      create: async () => { throw new Error('must not create') },
      updateVerifiedEmail: async (_id: string, email: string) => ({ id: 'id', email, name: 'Test' }),
    }
    await expect(provisionInternalUser({ ...identity, email_confirmed_at: null }, repository)).rejects.toThrow()
    await expect(provisionInternalUser({ ...identity, email: null }, repository)).rejects.toThrow()
  })
})

