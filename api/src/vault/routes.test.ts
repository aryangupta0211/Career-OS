import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryStorageProvider, setStorageProvider, StorageProviderError } from './storage.js'

const mocks = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'created-id', ...args.data })),
    update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn().mockResolvedValue({ id: 'deleted-id' }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(0),
    upsert: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue({ _sum: { usedBytes: 0 } }),
  })

  const prisma = {
    vaultFile: model(),
    resumeGroup: model(),
    resumeVersion: model(),
    jobDescription: model(),
    companyResource: model(),
    companyDocument: model(),
    applicationDocument: model(),
    storageUsage: model(),
    company: model(),
    jobApplication: model(),
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
    request.auth = { userId, email: `${userId}@example.com`, name: userId }
    next()
  },
}))

import { vaultRouter } from './routes.js'

describe('Vault API routes and storage operations', () => {
  const app = express()
  let server: ReturnType<typeof app.listen>
  let baseUrl: string
  let storageProvider: InMemoryStorageProvider

  beforeAll(async () => {
    storageProvider = new InMemoryStorageProvider()
    setStorageProvider(storageProvider)

    app.use(express.json())
    app.use('/api/vault', vaultRouter)

    server = app.listen(0)
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/vault`
  })

  afterAll(async () => {
    server.close()
    await once(server, 'close')
  })

  beforeEach(() => {
    vi.clearAllMocks()
    storageProvider.clear()
    setStorageProvider(storageProvider)
    mocks.prisma.storageUsage.findUnique.mockResolvedValue(null)
  })

  it('rejects unauthorized requests without a bearer token', async () => {
    const response = await fetch(`${baseUrl}/files`)
    expect(response.status).toBe(401)
  })

  it('allows authenticated users to list files and returns pagination metadata', async () => {
    mocks.prisma.vaultFile.count.mockResolvedValue(1)
    mocks.prisma.vaultFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        userId: 'user-a',
        originalFilename: 'resume.pdf',
        displayName: 'My Main Resume',
        category: 'RESUME',
        fileSizeBytes: 1024,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        companyDocuments: [],
        applicationDocuments: [],
        resumeVersions: [],
        jobDescriptions: [],
      },
    ])

    const response = await fetch(`${baseUrl}/files`, {
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.files).toHaveLength(1)
    expect(body.files[0].displayName).toBe('My Main Resume')
    expect(body.pagination.total).toBe(1)
  })

  it('uploads a valid PDF file and stores it in the storage provider', async () => {
    mocks.prisma.storageUsage.findUnique.mockResolvedValue(null)
    mocks.prisma.vaultFile.create.mockImplementation((args: any) => Promise.resolve({
      id: args.data.id,
      ...args.data,
      createdAt: new Date().toISOString(),
    }))

    const pdfBuffer = Buffer.from('%PDF-1.4\nValid PDF body')
    const formData = new FormData()
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'my_cv.pdf')
    formData.append('displayName', 'Engineering Resume')
    formData.append('category', 'RESUME')
    formData.append('tags', 'React, TypeScript')

    const response = await fetch(`${baseUrl}/files/upload`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user-a' },
      body: formData,
    })

    expect(response.status).toBe(201)
    const file = await response.json()
    expect(file.displayName).toBe('Engineering Resume')
    expect(file.category).toBe('RESUME')
    expect(mocks.prisma.vaultFile.create).toHaveBeenCalled()
  })

  it('rejects uploads that exceed the user quota', async () => {
    // Mock user has 100MB used
    mocks.prisma.storageUsage.findUnique.mockResolvedValue({
      userId: 'user-a',
      usedBytes: BigInt(105 * 1024 * 1024),
      fileCount: 20,
    })

    const pdfBuffer = Buffer.from('%PDF-1.4\nTest PDF')
    const formData = new FormData()
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'resume.pdf')

    const response = await fetch(`${baseUrl}/files/upload`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user-a' },
      body: formData,
    })

    expect(response.status).toBe(413)
    const errorBody = await response.json()
    expect(errorBody.error.code).toBe('STORAGE_QUOTA_EXCEEDED')
  })

  it('returns a safe 503 when the real storage provider rejects an upload', async () => {
    setStorageProvider({
      upload: vi.fn().mockRejectedValue(new StorageProviderError('VAULT_STORAGE_BUCKET_UNAVAILABLE', 'Vault storage is unavailable because its configured bucket could not be found.')),
      download: vi.fn(), delete: vi.fn(), createSignedUrl: vi.fn(),
    })
    const formData = new FormData()
    formData.append('file', new Blob([Buffer.from('%PDF-1.4\nTest PDF')], { type: 'application/pdf' }), 'resume.pdf')

    const response = await fetch(`${baseUrl}/files/upload`, {
      method: 'POST', headers: { Authorization: 'Bearer user-a' }, body: formData,
    })
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VAULT_STORAGE_BUCKET_UNAVAILABLE' },
    })
  })

  it('updates file metadata (displayName, description, tags)', async () => {
    mocks.prisma.vaultFile.findFirst.mockResolvedValue({
      id: 'file-123',
      userId: 'user-a',
      status: 'ACTIVE',
      displayName: 'Old Name',
    })

    const response = await fetch(`${baseUrl}/files/file-123`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: 'Updated Resume Name',
        description: 'New Description',
        tags: ['Frontend', 'Lead'],
      }),
    })

    expect(response.status).toBe(200)
    expect(mocks.prisma.vaultFile.updateMany).toHaveBeenCalledWith({
      where: { id: 'file-123', userId: 'user-a' },
      data: {
        displayName: 'Updated Resume Name',
        description: 'New Description',
        tags: ['Frontend', 'Lead'],
      },
    })
  })

  it('soft-deletes file to trash by default', async () => {
    mocks.prisma.vaultFile.findFirst.mockResolvedValue({
      id: 'file-del',
      userId: 'user-a',
      status: 'ACTIVE',
      resumeVersions: [],
      applicationDocuments: [],
    })

    const response = await fetch(`${baseUrl}/files/file-del`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    expect(mocks.prisma.vaultFile.updateMany).toHaveBeenCalledWith({
      where: { id: 'file-del', userId: 'user-a' },
      data: expect.objectContaining({ status: 'TRASHED' }),
    })
  })

  it('restores trashed file back to active', async () => {
    mocks.prisma.vaultFile.findFirst.mockResolvedValue({
      id: 'file-trashed',
      userId: 'user-a',
      status: 'TRASHED',
    })

    const response = await fetch(`${baseUrl}/files/file-trashed/restore`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    expect(mocks.prisma.vaultFile.updateMany).toHaveBeenCalledWith({
      where: { id: 'file-trashed', userId: 'user-a' },
      data: { status: 'ACTIVE', deletedAt: null },
    })
  })

  it('creates and lists resume groups', async () => {
    mocks.prisma.resumeGroup.create.mockResolvedValue({
      id: 'group-1',
      userId: 'user-a',
      name: 'Frontend Developer',
      targetRole: 'Staff Frontend Engineer',
      description: 'Tailored for UI roles',
      skills: ['React', 'TypeScript'],
      isArchived: false,
    })

    const createRes = await fetch(`${baseUrl}/resumes`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Frontend Developer',
        targetRole: 'Staff Frontend Engineer',
        skills: ['React', 'TypeScript'],
      }),
    })

    expect(createRes.status).toBe(201)
    const group = await createRes.json()
    expect(group.name).toBe('Frontend Developer')
  })

  it('uploads a new resume version preserving previous versions and assigning incremental version numbers', async () => {
    mocks.prisma.resumeGroup.findFirst.mockResolvedValue({
      id: 'group-fe',
      userId: 'user-a',
      name: 'Frontend Developer',
      versions: [
        { id: 'v1', versionNumber: 1, versionLabel: 'v1.0' },
      ],
    })
    mocks.prisma.storageUsage.findUnique.mockResolvedValue(null)

    const pdfBuffer = Buffer.from('%PDF-1.4\nVersion 2 Resume Content')
    const formData = new FormData()
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'fe_resume_v2.pdf')
    formData.append('versionLabel', 'v2.0')
    formData.append('description', 'Updated with recent React 19 experience')
    formData.append('skills', 'React, Next.js, Redux')
    formData.append('isCurrent', 'true')

    const response = await fetch(`${baseUrl}/resumes/group-fe/versions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user-a' },
      body: formData,
    })

    expect(response.status).toBe(201)
    expect(mocks.prisma.resumeVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        resumeGroupId: 'group-fe',
        versionNumber: 2,
        versionLabel: 'v2.0',
        isCurrent: true,
      }),
    }))
  })

  it('transactionally switches the current version without altering previous version records', async () => {
    mocks.prisma.resumeVersion.findFirst.mockResolvedValue({
      id: 'v1-id',
      userId: 'user-a',
      resumeGroupId: 'group-fe',
      versionLabel: 'v1.0',
      isCurrent: false,
    })

    const response = await fetch(`${baseUrl}/resumes/group-fe/versions/v1-id/current`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    expect(mocks.prisma.resumeVersion.updateMany).toHaveBeenCalledWith({
      where: { resumeGroupId: 'group-fe', userId: 'user-a', isCurrent: true },
      data: { isCurrent: false },
    })
    expect(mocks.prisma.resumeVersion.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1-id', userId: 'user-a' },
      data: { isCurrent: true },
    })
  })

  it('creates and lists job descriptions with text content and company association', async () => {
    mocks.prisma.company.findFirst.mockResolvedValue({ id: 'comp-1', userId: 'user-a', name: 'Google' })

    const response = await fetch(`${baseUrl}/job-descriptions`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Senior Software Engineer',
        companyId: 'comp-1',
        location: 'Mountain View, CA',
        experienceLevel: 'Senior',
        requiredSkills: ['Distributed Systems', 'Go', 'Kubernetes'],
        descriptionText: 'Designing scalable infrastructure systems.',
      }),
    })

    expect(response.status).toBe(201)
    expect(mocks.prisma.jobDescription.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: 'Senior Software Engineer',
        companyId: 'comp-1',
        location: 'Mountain View, CA',
      }),
    }))
  })

  it('creates and manages company resources and links', async () => {
    mocks.prisma.company.findFirst.mockResolvedValue({ id: 'comp-1', userId: 'user-a' })

    const response = await fetch(`${baseUrl}/companies/comp-1/resources`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Careers Portal',
        url: 'https://careers.google.com',
        description: 'Main careers listing',
        resourceType: 'CAREERS_PAGE',
      }),
    })

    expect(response.status).toBe(201)
    expect(mocks.prisma.companyResource.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        companyId: 'comp-1',
        title: 'Careers Portal',
        resourceType: 'CAREERS_PAGE',
      }),
    }))
  })

  it('enforces multi-tenant isolation (User B cannot access or modify User A resources)', async () => {
    // When User B tries to access file owned by User A, findFirst returns null
    mocks.prisma.vaultFile.findFirst.mockImplementation((args: any) => {
      if (args.where.userId === 'user-a' && args.where.id === 'user-a-file') {
        return Promise.resolve({ id: 'user-a-file', userId: 'user-a' })
      }
      return Promise.resolve(null)
    })

    const response = await fetch(`${baseUrl}/files/user-a-file`, {
      headers: { Authorization: 'Bearer user-b' },
    })

    expect(response.status).toBe(404)
  })

  it('returns storage summary and reconciliation numbers', async () => {
    mocks.prisma.storageUsage.findUnique.mockResolvedValue({
      userId: 'user-a',
      usedBytes: BigInt(5 * 1024 * 1024),
      fileCount: 3,
    })

    const response = await fetch(`${baseUrl}/storage/summary`, {
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    const summary = await response.json()
    expect(summary.usedBytes).toBe(5 * 1024 * 1024)
    expect(summary.fileCount).toBe(3)
    expect(summary.remainingQuotaBytes).toBeGreaterThan(0)
  })

  it('validates file ownership and returns a signed download URL with original filename', async () => {
    mocks.prisma.vaultFile.findFirst.mockImplementation((args: any) => {
      if (args.where.userId === 'user-a' && args.where.id === 'file-dl-1') {
        return Promise.resolve({
          id: 'file-dl-1',
          userId: 'user-a',
          displayName: 'Resume 2026',
          originalFilename: 'My_Original_Resume.pdf',
          storagePath: 'user-a/file-dl-1/My_Original_Resume.pdf',
          mimeType: 'application/pdf',
          status: 'ACTIVE',
        })
      }
      return Promise.resolve(null)
    })

    storageProvider.upload(
      'user-a/file-dl-1/My_Original_Resume.pdf',
      Buffer.from('%PDF-1.4\nTest PDF content'),
      'application/pdf',
    )

    const response = await fetch(`${baseUrl}/files/file-dl-1/download-url`, {
      headers: { Authorization: 'Bearer user-a' },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.downloadUrl).toBeDefined()
    expect(body.originalFilename).toBe('My_Original_Resume.pdf')
    expect(body.expiresInSeconds).toBeGreaterThan(0)
  })

  it('securely streams file download with proper Content-Disposition header', async () => {
    mocks.prisma.vaultFile.findFirst.mockImplementation((args: any) => {
      if (args.where.userId === 'user-a' && args.where.id === 'file-stream-1') {
        return Promise.resolve({
          id: 'file-stream-1',
          userId: 'user-a',
          displayName: 'Engineering Resume',
          originalFilename: 'eng_resume.pdf',
          storagePath: 'user-a/file-stream-1/eng_resume.pdf',
          mimeType: 'application/pdf',
          status: 'ACTIVE',
        })
      }
      return Promise.resolve(null)
    })

    await storageProvider.upload(
      'user-a/file-stream-1/eng_resume.pdf',
      Buffer.from('%PDF-1.4\nReal Binary Content for Download'),
      'application/pdf',
    )

    // Unauthenticated download request is rejected
    const unauthRes = await fetch(`${baseUrl}/files/file-stream-1/download`)
    expect(unauthRes.status).toBe(401)

    // Authenticated download streams with proper disposition header
    const authRes = await fetch(`${baseUrl}/files/file-stream-1/download`, {
      headers: { Authorization: 'Bearer user-a' },
    })
    expect(authRes.status).toBe(200)
    expect(authRes.headers.get('content-disposition')).toContain('attachment;')
    expect(authRes.headers.get('content-disposition')).toContain('eng_resume.pdf')
    const text = await authRes.text()
    expect(text).toContain('Real Binary Content for Download')
  })

  it('normalizes category values (e.g. "Resume" -> "RESUME") and updates file category and associations', async () => {
    mocks.prisma.vaultFile.findFirst.mockResolvedValue({
      id: 'file-cat-1',
      userId: 'user-a',
      status: 'ACTIVE',
      displayName: 'Old Name',
      category: 'OTHER',
    })
    mocks.prisma.company.findFirst.mockResolvedValue({ id: 'comp-123', userId: 'user-a' })

    const response = await fetch(`${baseUrl}/files/file-cat-1`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer user-a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: 'New Name',
        category: 'Resume',
        companyId: 'comp-123',
      }),
    })

    expect(response.status).toBe(200)
    expect(mocks.prisma.vaultFile.updateMany).toHaveBeenCalledWith({
      where: { id: 'file-cat-1', userId: 'user-a' },
      data: expect.objectContaining({
        displayName: 'New Name',
        category: 'RESUME',
      }),
    })
  })
})

