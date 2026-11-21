import crypto from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import type { DuplicateFileCheckResult } from './types.js'

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function checkFileDuplicate(
  prisma: PrismaClient,
  userId: string,
  sha256Hash: string
): Promise<DuplicateFileCheckResult> {
  if (!sha256Hash || !userId) {
    return { isDuplicate: false, sha256Hash: '' }
  }

  // Strict user isolation: only check files owned by this authenticated user
  const existing = await prisma.vaultFile.findFirst({
    where: {
      userId,
      sha256Hash,
      status: 'ACTIVE',
    },
    include: {
      resumeVersions: {
        include: { resumeGroup: { select: { id: true, name: true } } },
        take: 1,
      },
      companyDocuments: {
        include: { company: { select: { id: true, name: true } } },
        take: 3,
      },
      applicationDocuments: {
        include: { application: { select: { id: true, jobTitle: true } } },
        take: 3,
      },
    },
  })

  if (!existing) {
    return {
      isDuplicate: false,
      sha256Hash,
    }
  }

  return {
    isDuplicate: true,
    sha256Hash,
    existingFile: {
      id: existing.id,
      displayName: existing.displayName,
      originalFilename: existing.originalFilename,
      fileSizeBytes: existing.fileSizeBytes,
      createdAt: existing.createdAt.toISOString(),
      category: existing.category,
      resumeGroup: existing.resumeVersions[0]?.resumeGroup
        ? {
            id: existing.resumeVersions[0].resumeGroup.id,
            name: existing.resumeVersions[0].resumeGroup.name,
          }
        : undefined,
      companies: existing.companyDocuments
        .map((cd) => cd.company)
        .filter(Boolean)
        .map((c) => ({ id: c.id, name: c.name })),
      applications: existing.applicationDocuments
        .map((ad) => ad.application)
        .filter(Boolean)
        .map((a) => ({ id: a.id, jobTitle: a.jobTitle })),
    },
  }
}

