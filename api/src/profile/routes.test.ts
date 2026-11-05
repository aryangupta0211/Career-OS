import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const profile = {
    name: 'Taylor Example',
    email: 'taylor@example.test',
    firstName: 'Taylor',
    lastName: 'Example',
    phone: null,
    location: 'Toronto',
    headline: null,
    bio: null,
    currentRole: null,
    skills: ['Product design'],
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }
  return {
    profile,
    user: {
      findUnique: vi.fn().mockResolvedValue(profile),
      update: vi.fn().mockResolvedValue(profile),
    },
  }
})

vi.mock('../db/client.js', () => ({ getPrismaClient: () => ({ user: mocks.user }) }))
vi.mock('../auth/middleware.js', () => ({
  requireAuth: (request: Request, _response: Response, next: NextFunction) => {
    request.auth = { userId: 'owner-1', email: 'taylor@example.test', name: 'Taylor Example' }
    next()
  },
}))

import { profileRouter } from './routes.js'

describe('authenticated profile API', () => {
  const app = express()
  let server: ReturnType<typeof app.listen>
  let baseUrl: string

  beforeAll(async () => {
    app.use(express.json())
    app.use('/api/profile', profileRouter)
    server = app.listen(0)
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/profile`
  })

  afterAll(async () => {
    server.close()
    await once(server, 'close')
  })

  beforeEach(() => {
    mocks.user.findUnique.mockReset().mockResolvedValue(mocks.profile)
    mocks.user.update.mockReset().mockResolvedValue(mocks.profile)
  })

  it('reads only the authenticated internal user profile and omits internal identifiers', async () => {
    const response = await fetch(`${baseUrl}?userId=owner-2`)
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(mocks.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'owner-1' },
    }))
    expect(body.displayName).toBe('Taylor Example')
    expect(body.email).toBe('taylor@example.test')
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('supabaseAuthId')
  })

  it('returns a not-found response when the verified internal mapping has no profile record', async () => {
    mocks.user.findUnique.mockResolvedValueOnce(null)
    const response = await fetch(baseUrl)
    const body = await response.json() as { error: { code: string } }

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('PROFILE_NOT_FOUND')
  })

  it('updates the authenticated profile only and rejects a client-supplied owner ID', async () => {
    const response = await fetch(baseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Taylor E.',
        firstName: 'Taylor',
        lastName: 'Example',
        phone: '+1 (555) 222-1234',
        location: 'Vancouver',
        headline: 'Product designer',
        bio: 'Designs useful career tools.',
        currentRole: 'Product designer',
        skills: ['Research', 'Prototyping'],
        linkedinUrl: 'https://linkedin.com/in/taylor',
        githubUrl: '',
        portfolioUrl: '',
      }),
    })
    expect(response.status).toBe(200)
    expect(mocks.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'owner-1' },
      data: expect.objectContaining({
        name: 'Taylor E.',
        phone: '+1 (555) 222-1234',
        skills: ['Research', 'Prototyping'],
      }),
    }))

    const rejected = await fetch(baseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Taylor E.',
        firstName: '',
        lastName: '',
        phone: '',
        location: '',
        headline: '',
        bio: '',
        currentRole: '',
        skills: [],
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
        userId: 'owner-2',
      }),
    })
    expect(rejected.status).toBe(400)
    expect(mocks.user.update).toHaveBeenCalledOnce()
  })

  it('validates profile URLs and phone numbers', async () => {
    const response = await fetch(baseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Taylor',
        firstName: '',
        lastName: '',
        phone: 'call me',
        location: '',
        headline: '',
        bio: '',
        currentRole: '',
        skills: [],
        linkedinUrl: 'javascript:alert(1)',
        githubUrl: '',
        portfolioUrl: '',
      }),
    })

    expect(response.status).toBe(400)
    expect(mocks.user.update).not.toHaveBeenCalled()
  })
})
