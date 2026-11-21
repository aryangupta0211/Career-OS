import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabaseAuthClient: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}))

vi.mock('../db/client.js', () => ({ getPrismaClient: () => mocks.prisma }))
vi.mock('./supabaseClient.js', () => ({ getSupabaseAuthClient: mocks.getSupabaseAuthClient }))

import { requireAuth } from './middleware.js'

describe('requireAuth middleware', () => {
  const app = express()
  let server: ReturnType<typeof app.listen>
  let protectedUrl: string

  beforeAll(async () => {
    app.get('/protected', requireAuth, (request, response) => {
      response.json({ userId: request.auth?.userId })
    })
    server = app.listen(0)
    await once(server, 'listening')
    protectedUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/protected`
  })

  afterAll(async () => {
    server.close()
    await once(server, 'close')
  })

  beforeEach(() => {
    mocks.supabase.auth.getUser.mockReset().mockImplementation(async (token: string) => ({
      data: {
        user: {
          id: `auth-${token}`,
          email: `auth-${token}@example.test`,
          email_confirmed_at: '2026-10-28T00:00:00.000Z',
        },
      },
      error: null,
    }))
    mocks.prisma.user.findUnique.mockReset().mockImplementation(async (input: { where: { supabaseAuthId: string } }) => ({
      id: `internal-${input.where.supabaseAuthId}`,
      email: `${input.where.supabaseAuthId}@example.test`,
      name: input.where.supabaseAuthId,
    }))
    mocks.prisma.user.update.mockReset()
    mocks.getSupabaseAuthClient.mockReturnValue(mocks.supabase)
  })

  it('fails closed with an explicit service error when Supabase configuration is missing', async () => {
    mocks.getSupabaseAuthClient.mockImplementationOnce(() => {
      throw new Error('Supabase authentication is not configured.')
    })
    const response = await fetch(protectedUrl, { headers: { Authorization: 'Bearer valid-token' } })
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { code: 'AUTH_NOT_CONFIGURED' },
    })
    expect(mocks.supabase.auth.getUser).not.toHaveBeenCalled()
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('verifies a valid bearer token with Supabase before resolving its internal UUID mapping', async () => {
    const response = await fetch(protectedUrl, { headers: { Authorization: 'Bearer user-a' } })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ userId: 'internal-auth-user-a' })
    expect(mocks.supabase.auth.getUser).toHaveBeenCalledWith('user-a')
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { supabaseAuthId: 'auth-user-a' },
    }))
  })

  it('rejects invalid bearer tokens without resolving an internal user', async () => {
    mocks.supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 401 },
    })
    const response = await fetch(protectedUrl, { headers: { Authorization: 'Bearer invalid-token' } })
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })
    expect(mocks.supabase.auth.getUser).toHaveBeenCalledWith('invalid-token')
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated API requests before database access', async () => {
    const response = await fetch(protectedUrl)
    expect(response.status).toBe(401)
    expect(mocks.supabase.auth.getUser).not.toHaveBeenCalled()
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('maps two verified Supabase identities to separate internal users', async () => {
    const userA = await fetch(protectedUrl, { headers: { Authorization: 'Bearer user-a' } })
    const userB = await fetch(protectedUrl, { headers: { Authorization: 'Bearer user-b' } })
    expect(await userA.json()).toEqual({ userId: 'internal-auth-user-a' })
    expect(await userB.json()).toEqual({ userId: 'internal-auth-user-b' })
    expect(mocks.prisma.user.findUnique).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { supabaseAuthId: 'auth-user-a' },
    }))
    expect(mocks.prisma.user.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { supabaseAuthId: 'auth-user-b' },
    }))
  })
})
