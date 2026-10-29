import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue({ id: 'owned-record' }),
    create: vi.fn().mockResolvedValue({ id: 'created-record' }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  })
  const prisma = {
    company: model(),
    jobApplication: model(),
    contact: model(),
    task: model(),
    event: model(),
    activity: model(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (operation: (transaction: typeof prisma) => unknown) => operation(prisma))
  return { prisma }
})

vi.mock('../db/client.js', () => ({ getPrismaClient: () => mocks.prisma }))
vi.mock('../auth/middleware.js', () => ({
  requireAuth: (request: Request, _response: Response, next: NextFunction) => {
    const userId = request.get('authorization') === 'Bearer owner-2' ? 'owner-2' : 'owner-1'
    request.auth = { userId, email: `${userId}@example.test`, name: 'Owner' }
    next()
  },
}))

import { dataRouter } from './routes.js'

const companyPayload = {
  name: 'Example Co', industry: '', location: '', website: '', size: '',
  tags: '', careersUrl: '', linkedinUrl: '', notes: '',
}

describe('owner-scoped data API routes', () => {
  const app = express()
  let server: ReturnType<typeof app.listen>
  let baseUrl: string

  beforeAll(async () => {
    app.use(express.json())
    app.use('/api/data', dataRouter)
    server = app.listen(0)
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/data`
  })

  afterAll(async () => {
    server.close()
    await once(server, 'close')
  })

  beforeEach(() => {
    for (const resource of [mocks.prisma.company, mocks.prisma.jobApplication, mocks.prisma.contact, mocks.prisma.task, mocks.prisma.event, mocks.prisma.activity]) {
      resource.findMany.mockReset().mockResolvedValue([])
      resource.findFirst.mockReset().mockResolvedValue({ id: 'owned-record' })
      resource.create.mockReset().mockResolvedValue({ id: 'created-record' })
      resource.updateMany.mockReset().mockResolvedValue({ count: 1 })
      resource.deleteMany.mockReset().mockResolvedValue({ count: 1 })
    }
    mocks.prisma.$transaction.mockReset().mockImplementation(
      async (operation: (transaction: typeof mocks.prisma) => unknown) => operation(mocks.prisma),
    )
  })

  it('scopes every collection read to the authenticated internal user', async () => {
    const response = await fetch(baseUrl)
    expect(response.status).toBe(200)
    for (const model of [mocks.prisma.company, mocks.prisma.jobApplication, mocks.prisma.contact, mocks.prisma.task, mocks.prisma.event, mocks.prisma.activity]) {
      expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner-1' } }))
    }
  })

  it('keeps records separated when requests resolve to different authenticated owners', async () => {
    const first = await fetch(baseUrl)
    const second = await fetch(baseUrl, { headers: { Authorization: 'Bearer owner-2' } })
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mocks.prisma.company.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { userId: 'owner-1' } }))
    expect(mocks.prisma.company.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { userId: 'owner-2' } }))
  })

  it('derives the owner on create and rejects related records not owned by that user', async () => {
    const created = await fetch(`${baseUrl}/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyPayload),
    })
    expect(created.status).toBe(201)
    expect(mocks.prisma.company.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'owner-1', name: 'Example Co' }),
    }))

    mocks.prisma.company.findFirst.mockResolvedValueOnce(null)
    const rejected = await fetch(`${baseUrl}/application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Designer', companyId: 'other-users-company', status: 'Applied',
        appliedAt: '', nextAction: '', nextFollowUpAt: '', location: '', jobDescription: '',
        prepNotes: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time',
        workArrangement: 'Remote', resumeReference: '', notes: '',
      }),
    })
    expect(rejected.status).toBe(404)
    expect(mocks.prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'other-users-company', userId: 'owner-1' }, select: { id: true },
    })
    expect(mocks.prisma.jobApplication.create).not.toHaveBeenCalled()
  })

  it('creates, updates, and deletes each owner-scoped record type', async () => {
    const records = [
      { kind: 'company', payload: companyPayload, model: mocks.prisma.company },
      {
        kind: 'application',
        payload: {
          jobTitle: 'Designer', companyId: 'company-1', status: 'Applied', appliedAt: '',
          nextAction: '', nextFollowUpAt: '', location: '', jobDescription: 'Product design role.',
          prepNotes: 'Prepare portfolio slides.',
          jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Remote',
          resumeReference: '', notes: '',
        },
        model: mocks.prisma.jobApplication,
      },
      {
        kind: 'contact',
        payload: {
          name: 'Jordan Example', jobTitle: '', companyId: '', status: 'Connected', lastContactedAt: '',
          tags: 'mentor, hiring', linkedinUrl: '', email: '', phone: '', connectionRequestedAt: '',
          connectionAcceptedAt: '', nextFollowUpAt: '', notes: '',
        },
        model: mocks.prisma.contact,
      },
      {
        kind: 'task',
        payload: {
          title: 'Follow up', companyId: '', dueAt: '', priority: 'Medium', done: true,
          description: '', contactId: '', applicationId: '', category: 'Networking',
        },
        model: mocks.prisma.task,
      },
      {
        kind: 'event',
        payload: {
          title: 'Interview', eventType: 'Interview', companyId: '',
          startsAt: '2026-10-28T15:00:00.000Z', location: '', endsAt: '',
          meetingUrl: '', notes: '', contactId: '', applicationId: '',
        },
        model: mocks.prisma.event,
      },
    ] as const

    for (const { kind, payload, model } of records) {
      const created = await fetch(`${baseUrl}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      expect(created.status, `${kind} create`).toBe(201)
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ userId: 'owner-1' }),
      }))
      if (kind === 'application') {
        expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ prepNotes: 'Prepare portfolio slides.' }),
        }))
      } else if (kind === 'contact') {
        expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ tags: ['mentor', 'hiring'] }),
        }))
      } else if (kind === 'task') {
        expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ category: 'Networking', status: 'COMPLETED' }),
        }))
      }

      const updated = await fetch(`${baseUrl}/${kind}/record-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      expect(updated.status, `${kind} update`).toBe(204)
      expect(model.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'record-1', userId: 'owner-1' },
      }))

      const deleted = await fetch(`${baseUrl}/${kind}/record-1`, { method: 'DELETE' })
      expect(deleted.status, `${kind} delete`).toBe(204)
      expect(model.deleteMany).toHaveBeenCalledWith({ where: { id: 'record-1', userId: 'owner-1' } })
    }
  })

  it('returns owner-scoped 404 for an update to an inaccessible record', async () => {
    mocks.prisma.company.updateMany.mockResolvedValueOnce({ count: 0 })
    const response = await fetch(`${baseUrl}/company/not-owned`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyPayload),
    })
    expect(response.status).toBe(404)
    expect(mocks.prisma.company.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'not-owned', userId: 'owner-1' },
    }))
  })

  it('unlinks dependent records and deletes in one transaction', async () => {
    const response = await fetch(`${baseUrl}/company/company-1`, { method: 'DELETE' })
    expect(response.status).toBe(204)
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1)
    for (const model of [mocks.prisma.contact, mocks.prisma.jobApplication, mocks.prisma.task, mocks.prisma.event, mocks.prisma.activity]) {
      expect(model.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'owner-1', companyId: 'company-1' },
        data: { companyId: null },
      }))
    }
    expect(mocks.prisma.company.deleteMany).toHaveBeenCalledWith({ where: { id: 'company-1', userId: 'owner-1' } })
  })
})
