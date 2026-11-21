import type { PrismaClient } from '@prisma/client'
import type { DocumentSearchResultItem } from './types.js'

export interface DocumentSearchParams {
  query: string
  category?: string
  extension?: string
  companyId?: string
  applicationId?: string
  page?: number
  limit?: number
}

function extractSearchSnippet(text: string, term: string, radius = 50): string {
  if (!text || !term) return ''
  const lowerText = text.toLowerCase()
  const lowerTerm = term.toLowerCase()
  const idx = lowerText.indexOf(lowerTerm)
  if (idx === -1) return text.slice(0, 100) + '...'

  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + term.length + radius)
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim()
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'
  return snippet
}

export async function searchUserVaultDocuments(
  prisma: PrismaClient,
  userId: string,
  params: DocumentSearchParams
): Promise<{ items: DocumentSearchResultItem[]; total: number; page: number; limit: number }> {
  const query = (params.query || '').trim().toLowerCase()
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 20))
  const skip = (page - 1) * limit

  // Base where clause strictly scoped to user
  const where: any = {
    userId,
    status: 'ACTIVE',
  }

  if (params.category && params.category !== 'ALL') {
    where.category = params.category
  }

  if (params.extension && params.extension !== 'ALL') {
    where.extension = params.extension.startsWith('.') ? params.extension : `.${params.extension}`
  }

  if (params.companyId) {
    where.companyDocuments = {
      some: { companyId: params.companyId },
    }
  }

  if (params.applicationId) {
    where.applicationDocuments = {
      some: { applicationId: params.applicationId },
    }
  }

  // Fetch candidate files for this user
  const files = await prisma.vaultFile.findMany({
    where,
    include: {
      jobDescriptions: {
        select: {
          id: true,
          title: true,
          descriptionText: true,
          responsibilities: true,
          requiredSkills: true,
          preferredSkills: true,
        },
      },
      resumeVersions: {
        include: {
          resumeGroup: { select: { id: true, name: true, targetRole: true } },
        },
      },
      companyDocuments: {
        include: {
          company: { select: { id: true, name: true } },
        },
      },
      applicationDocuments: {
        include: {
          application: { select: { id: true, jobTitle: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const results: DocumentSearchResultItem[] = []

  for (const file of files) {
    if (!query) {
      // If no query string, return all matching filtered files
      results.push({
        id: file.id,
        displayName: file.displayName,
        originalFilename: file.originalFilename,
        category: file.category,
        mimeType: file.mimeType,
        fileSizeBytes: file.fileSizeBytes,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
        matchType: 'metadata',
        matchHighlights: [],
        companyName: file.companyDocuments[0]?.company?.name,
        jobTitle: file.applicationDocuments[0]?.application?.jobTitle || file.jobDescriptions[0]?.title,
      })
      continue
    }

    // Check Metadata
    const metadataFields = [
      file.displayName,
      file.originalFilename,
      file.description || '',
      ...(file.tags || []),
      file.category,
      file.companyDocuments[0]?.company?.name || '',
      file.applicationDocuments[0]?.application?.jobTitle || '',
      file.resumeVersions[0]?.resumeGroup?.name || '',
      file.resumeVersions[0]?.resumeGroup?.targetRole || '',
      file.resumeVersions[0]?.versionLabel || '',
      file.jobDescriptions[0]?.title || '',
    ]

    const matchedMetadata = metadataFields.some((f) => f.toLowerCase().includes(query))

    // Check Document Content (linked JD texts, responsibilities, skills)
    let contentMatched = false
    let contentSnippet = ''
    const contentTextParts: string[] = []

    for (const jd of file.jobDescriptions) {
      if (jd.descriptionText) contentTextParts.push(jd.descriptionText)
      if (jd.responsibilities) contentTextParts.push(jd.responsibilities)
      if (jd.requiredSkills?.length) contentTextParts.push(jd.requiredSkills.join(' '))
      if (jd.preferredSkills?.length) contentTextParts.push(jd.preferredSkills.join(' '))
    }

    const fullContent = contentTextParts.join(' ')
    if (fullContent.toLowerCase().includes(query)) {
      contentMatched = true
      contentSnippet = extractSearchSnippet(fullContent, query)
    }

    if (matchedMetadata || contentMatched) {
      const matchType: 'content' | 'metadata' | 'both' =
        matchedMetadata && contentMatched ? 'both' : contentMatched ? 'content' : 'metadata'

      const matchHighlights: string[] = []
      if (matchedMetadata) matchHighlights.push('Filename or Metadata')
      if (contentMatched) matchHighlights.push('Document Content')

      results.push({
        id: file.id,
        displayName: file.displayName,
        originalFilename: file.originalFilename,
        category: file.category,
        mimeType: file.mimeType,
        fileSizeBytes: file.fileSizeBytes,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
        snippet: contentSnippet || (file.description ? extractSearchSnippet(file.description, query) : undefined),
        matchType,
        matchHighlights,
        companyName: file.companyDocuments[0]?.company?.name,
        jobTitle: file.applicationDocuments[0]?.application?.jobTitle || file.jobDescriptions[0]?.title,
      })
    }
  }

  const paginated = results.slice(skip, skip + limit)

  return {
    items: paginated,
    total: results.length,
    page,
    limit,
  }
}

