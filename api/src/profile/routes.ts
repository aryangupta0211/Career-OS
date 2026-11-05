import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../db/client.js'
import { requireAuth } from '../auth/middleware.js'

const optionalText = z.string().trim()
const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  firstName: optionalText.max(100),
  lastName: optionalText.max(100),
  phone: optionalText.max(40).refine((value) => !value || /^\+?[0-9\s().-]{7,40}$/.test(value), 'Enter a valid phone number.'),
  location: optionalText.max(160),
  headline: optionalText.max(180),
  bio: optionalText.max(2000),
  currentRole: optionalText.max(160),
  skills: z.array(z.string().trim().min(1).max(50)).max(40),
  linkedinUrl: optionalText.max(500).refine(isOptionalWebUrl, 'Enter a valid LinkedIn URL.'),
  githubUrl: optionalText.max(500).refine(isOptionalWebUrl, 'Enter a valid GitHub URL.'),
  portfolioUrl: optionalText.max(500).refine(isOptionalWebUrl, 'Enter a valid portfolio URL.'),
}).strict()

function isOptionalWebUrl(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const profileSelect = {
  name: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  location: true,
  headline: true,
  bio: true,
  currentRole: true,
  skills: true,
  linkedinUrl: true,
  githubUrl: true,
  portfolioUrl: true,
  createdAt: true,
} as const

function profileResponse(user: {
  name: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  location: string | null
  headline: string | null
  bio: string | null
  currentRole: string | null
  skills: string[]
  linkedinUrl: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  createdAt: Date
}) {
  return {
    displayName: user.name,
    email: user.email,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
    location: user.location ?? '',
    headline: user.headline ?? '',
    bio: user.bio ?? '',
    currentRole: user.currentRole ?? '',
    skills: user.skills,
    linkedinUrl: user.linkedinUrl ?? '',
    githubUrl: user.githubUrl ?? '',
    portfolioUrl: user.portfolioUrl ?? '',
    createdAt: user.createdAt.toISOString(),
  }
}

export const profileRouter = Router()
profileRouter.use(requireAuth)

profileRouter.get('/', async (request, response) => {
  const userId = request.auth?.userId
  if (!userId) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid account is required.' } })
    return
  }
  const user = await getPrismaClient().user.findUnique({
    where: { id: userId },
    select: profileSelect,
  })
  if (!user) {
    response.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Your CareerOS profile is not available.' } })
    return
  }
  response.json(profileResponse(user))
})

profileRouter.patch('/', async (request, response) => {
  const userId = request.auth?.userId
  if (!userId) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid account is required.' } })
    return
  }
  const parsed = profileSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({
      error: { code: 'INVALID_PROFILE', message: 'Review the highlighted profile fields.', issues: parsed.error.issues },
    })
    return
  }
  const profile = parsed.data
  try {
    const user = await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        name: profile.displayName,
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        phone: profile.phone || null,
        location: profile.location || null,
        headline: profile.headline || null,
        bio: profile.bio || null,
        currentRole: profile.currentRole || null,
        skills: profile.skills,
        linkedinUrl: profile.linkedinUrl || null,
        githubUrl: profile.githubUrl || null,
        portfolioUrl: profile.portfolioUrl || null,
      },
      select: profileSelect,
    })
    response.json(profileResponse(user))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      response.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Your CareerOS profile is not available.' } })
      return
    }
    throw error
  }
})
