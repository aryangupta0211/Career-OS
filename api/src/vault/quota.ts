import { type PrismaClient } from '@prisma/client'
import { config } from '../config.js'

export interface StorageSummary {
  usedBytes: number
  totalQuotaBytes: number
  projectQuotaBytes: number
  remainingQuotaBytes: number
  fileCount: number
  usagePercentage: number
  maxFileSizeBytes: number
}

export async function checkUserQuota(
  prisma: PrismaClient,
  userId: string,
  additionalBytes: number,
): Promise<{ allowed: boolean; currentBytes: number; remainingBytes: number }> {
  const usage = await prisma.storageUsage.findUnique({
    where: { userId },
  })

  const currentBytes = usage ? Number(usage.usedBytes) : 0
  const maxQuota = config.VAULT_USER_QUOTA_BYTES
  const remainingBytes = Math.max(0, maxQuota - currentBytes)

  if (currentBytes + additionalBytes > maxQuota) {
    return { allowed: false, currentBytes, remainingBytes }
  }

  // Also check project-level budget
  const aggregate = await prisma.storageUsage.aggregate({
    _sum: { usedBytes: true },
  })
  const projectTotal = aggregate._sum.usedBytes ? Number(aggregate._sum.usedBytes) : 0
  if (projectTotal + additionalBytes > config.VAULT_PROJECT_QUOTA_BYTES) {
    return { allowed: false, currentBytes, remainingBytes: 0 }
  }

  return { allowed: true, currentBytes, remainingBytes }
}

export async function incrementUserQuota(
  prisma: PrismaClient,
  userId: string,
  additionalBytes: number,
): Promise<void> {
  await prisma.storageUsage.upsert({
    where: { userId },
    create: {
      userId,
      usedBytes: BigInt(additionalBytes),
      fileCount: 1,
    },
    update: {
      usedBytes: { increment: BigInt(additionalBytes) },
      fileCount: { increment: 1 },
    },
  })
}

export async function decrementUserQuota(
  prisma: PrismaClient,
  userId: string,
  bytes: number,
): Promise<void> {
  const current = await prisma.storageUsage.findUnique({ where: { userId } })
  if (!current) return

  const newBytes = Math.max(0, Number(current.usedBytes) - bytes)
  const newCount = Math.max(0, current.fileCount - 1)

  await prisma.storageUsage.update({
    where: { userId },
    data: {
      usedBytes: BigInt(newBytes),
      fileCount: newCount,
    },
  })
}

export async function getStorageSummary(
  prisma: PrismaClient,
  userId: string,
): Promise<StorageSummary> {
  const usage = await prisma.storageUsage.findUnique({
    where: { userId },
  })

  const usedBytes = usage ? Number(usage.usedBytes) : 0
  const totalQuotaBytes = config.VAULT_USER_QUOTA_BYTES
  const projectQuotaBytes = config.VAULT_PROJECT_QUOTA_BYTES
  const remainingQuotaBytes = Math.max(0, totalQuotaBytes - usedBytes)
  const fileCount = usage ? usage.fileCount : 0
  const usagePercentage = totalQuotaBytes > 0
    ? Math.min(100, Math.round((usedBytes / totalQuotaBytes) * 100))
    : 0

  return {
    usedBytes,
    totalQuotaBytes,
    projectQuotaBytes,
    remainingQuotaBytes,
    fileCount,
    usagePercentage,
    maxFileSizeBytes: config.VAULT_MAX_FILE_SIZE_BYTES,
  }
}

export async function reconcileUserStorage(
  prisma: PrismaClient,
  userId: string,
): Promise<StorageSummary> {
  // Compute sum of active files
  const activeFiles = await prisma.vaultFile.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    select: { fileSizeBytes: true },
  })

  const computedBytes = activeFiles.reduce((acc, file) => acc + BigInt(file.fileSizeBytes), BigInt(0))
  const computedCount = activeFiles.length

  await prisma.storageUsage.upsert({
    where: { userId },
    create: {
      userId,
      usedBytes: computedBytes,
      fileCount: computedCount,
    },
    update: {
      usedBytes: computedBytes,
      fileCount: computedCount,
    },
  })

  return getStorageSummary(prisma, userId)
}
