import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { intelligenceRouter } from './routes.js'

const mocks = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'created-id', ...args.data })),
    update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
    delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
  })

  const prisma = {
    vaultFile: model(),
    resumeGroup: model(),
    resumeVersion: model(),
    jobDescription: model(),
    jobApplication: model(),
    task: model(),
    event: model(),
    contact: model(),
    company: model(),
    $transaction: vi.fn(),
  }

  prisma.$transaction.mockImplementation(async (operation: (transaction: typeof prisma) => unknown) => operation(prisma))

  return { prisma }
})

vi.mock('../db/client.js', () => ({ getPrismaClient: () => mocks.prisma }))
vi.mock('../auth/middleware.js', () => ({
  requireAuth: (request: Request, response: Response, next: NextFunction) => {
    const authHeader = request.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token required.' } })
      return
    }
    const token = authHeader.slice(7)
    const userId = token === 'user-b' ? 'user-b' : 'user-a'
    request.auth = { userId, token }
    next()
  },
}))

describe('Intelligence API Routes', () => {
  let server: ReturnType<typeof express.application.listen>
  let baseUrl: string

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/intelligence', intelligenceRouter)
    server = app.listen(0)
    await once(server, 'listening')
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}/api/intelligence`
  })

  afterAll(async () => {
    server?.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /jd/extract extracts structured details from raw text', async () => {
    const response = await fetch(`${baseUrl}/jd/extract`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `
Job Title: Senior Backend Developer
Company: Netflix
Requirements:
• 5+ years of experience with Java and Spring Boot.
• Hands-on SQL and PostgreSQL experience.
`,
      }),
    })

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.ok).toBe(true)
    expect(result.data.jobTitle.value).toBe('Senior Backend Developer')
    expect(result.data.companyName.value).toBe('Netflix')
    const skillNames = result.data.requiredSkills.map((s: any) => s.name)
    expect(skillNames).toContain('Java')
    expect(skillNames).toContain('Spring Boot')
    expect(skillNames).toContain('PostgreSQL')
  })

  it('GET /applications/:id/resume-matches calculates ranked resume recommendations', async () => {
    mocks.prisma.jobApplication.findFirst.mockResolvedValue({
      id: 'app-1',
      userId: 'user-a',
      jobTitle: 'Backend Engineer',
      jobDescription: 'Requirements: Java, Spring Boot, PostgreSQL.',
      jobDescriptions: [
        {
          id: 'jd-1',
          requiredSkills: ['Java', 'Spring Boot', 'PostgreSQL'],
          preferredSkills: ['Docker'],
        },
      ],
    })

    mocks.prisma.resumeVersion.findMany.mockResolvedValue([
      {
        id: 'rv-1',
        resumeGroupId: 'rg-1',
        versionNumber: 1,
        versionLabel: 'Backend Standard',
        skills: ['Java', 'Spring Boot', 'PostgreSQL'],
        resumeGroup: { id: 'rg-1', name: 'Backend Resume', targetRole: 'Backend Engineer', skills: [] },
        vaultFile: { tags: ['Backend'] },
      },
    ])

    const response = await fetch(`${baseUrl}/applications/app-1/resume-matches`, {
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.matches.length).toBe(1)
    expect(data.matches[0].score).toBeGreaterThanOrEqual(75)
    expect(data.matches[0].matchedSkills).toContain('Java')
  })

  it('POST /applications/:id/preparation/generate generates targeted tasks', async () => {
    mocks.prisma.jobApplication.findFirst.mockResolvedValue({
      id: 'app-1',
      userId: 'user-a',
      jobTitle: 'Java Developer',
      company: { id: 'c-1', name: 'Google' },
      jobDescriptions: [{ requiredSkills: ['Java', 'SQL'], preferredSkills: [] }],
    })

    const response = await fetch(`${baseUrl}/applications/app-1/preparation/generate`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.tasks.length).toBe(2)
    expect(data.tasks[0].title).toContain('Java')
  })

  it('POST /applications/:id/preparation/create-tasks creates confirmed tasks in Task model', async () => {
    mocks.prisma.jobApplication.findFirst.mockResolvedValue({
      id: 'app-1',
      userId: 'user-a',
      companyId: 'comp-1',
    })

    const response = await fetch(`${baseUrl}/applications/app-1/preparation/create-tasks`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: [
          { title: 'Revise Java Streams', category: 'Technical Prep', priority: 'High' },
          { title: 'Practice SQL Joins', category: 'Technical Prep', priority: 'Medium' },
        ],
      }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.createdCount).toBe(2)
    expect(mocks.prisma.task.create).toHaveBeenCalledTimes(2)
  })

  it('POST /files/check-duplicate identifies existing user files by hash', async () => {
    mocks.prisma.vaultFile.findFirst.mockResolvedValue({
      id: 'vf-dup',
      displayName: 'Existing.pdf',
      originalFilename: 'Existing.pdf',
      fileSizeBytes: 2048,
      createdAt: new Date(),
      category: 'RESUME',
      resumeVersions: [],
      companyDocuments: [],
      applicationDocuments: [],
    })

    const response = await fetch(`${baseUrl}/files/check-duplicate`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sha256Hash: 'dummyhash123' }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.result.isDuplicate).toBe(true)
    expect(data.result.existingFile.id).toBe('vf-dup')
  })

  it('GET /insights returns smart actionable reminders and metrics', async () => {
    mocks.prisma.jobApplication.findMany.mockResolvedValue([
      {
        id: 'app-1',
        jobTitle: 'Backend Engineer',
        status: 'INTERVIEW',
        appliedAt: new Date(),
        events: [],
        tasks: [],
        company: { name: 'Meta' },
      },
    ])
    mocks.prisma.task.findMany.mockResolvedValue([
      {
        id: 't-1',
        title: 'Interview prep',
        status: 'TODO',
        dueAt: new Date(Date.now() - 86400000), // Overdue by 1 day
        category: 'Technical Prep',
      },
    ])
    mocks.prisma.event.findMany.mockResolvedValue([])
    mocks.prisma.contact.findMany.mockResolvedValue([])

    const response = await fetch(`${baseUrl}/insights`, {
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.data.stats.activeApplications).toBe(1)
    expect(data.data.stats.overdueTasksCount).toBe(1)
    expect(data.data.suggestedActions.length).toBeGreaterThanOrEqual(1)
  })
})

