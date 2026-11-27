import { Router } from 'express'
import { getPrismaClient } from '../db/client.js'
import { verifySupabaseBearer } from './identity.js'
import { getSupabaseAuthClient, getSupabaseAdminClient } from './supabaseClient.js'
import { ProvisioningConflictError, ProvisioningDuplicateEmailError, provisionInternalUser } from './provisioning.js'

export const authRouter = Router()

authRouter.post('/provision', async (request, response) => {
  let supabase
  try {
    supabase = getSupabaseAuthClient()
  } catch {
    response.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured on this server.' } })
    return
  }

  const verified = await verifySupabaseBearer(request.get('authorization'), {
    getUser: (token) => supabase.auth.getUser(token),
  })
  if (!verified.ok) {
    if (verified.status === 503) request.log.error({ code: verified.code }, 'Supabase identity verification unavailable')
    response.status(verified.status).json({ error: { code: verified.code, message: verified.message } })
    return
  }

  try {
    const prisma = getPrismaClient()
    const user = await provisionInternalUser(verified.identity, {
      findBySupabaseAuthId: (id) => prisma.user.findUnique({
        where: { supabaseAuthId: id },
        select: { id: true, email: true, name: true, supabaseAuthId: true },
      }),
      findDuplicatesByVerifiedEmail: (email) => prisma.user.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, name: true, supabaseAuthId: true },
      }),
      findByVerifiedEmail: (email) => prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, name: true, supabaseAuthId: true },
      }),
      linkSupabaseAuthId: async (userId, supabaseAuthId, expectedCurrentAuthId = null) => {
        const result = await prisma.user.updateMany({
          where: { id: userId, supabaseAuthId: expectedCurrentAuthId },
          data: { supabaseAuthId },
        })
        if (result.count !== 1) throw { code: 'P2002' }
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, supabaseAuthId: true },
        })
        if (!user) throw new Error('Linked user is unavailable.')
        return user
      },
      create: (input) => prisma.user.create({ data: input, select: { id: true, email: true, name: true } }),
      updateVerifiedEmail: (userId, email) => prisma.user.update({
        where: { id: userId },
        data: { email },
        select: { id: true, email: true, name: true },
      }),
      isSupabaseAuthIdActive: async (id: string) => {
        const admin = getSupabaseAdminClient()
        if (!admin) return true // Fail safe to active if admin client is not configured
        try {
          const { data, error } = await admin.auth.admin.getUserById(id)
          if (error) {
            // If Supabase confirms user not found, the ID is orphaned from a deleted Auth user
            if (error.status === 404 || error.message?.toLowerCase().includes('not found')) {
              return false
            }
            return true
          }
          return Boolean(data?.user)
        } catch {
          return true
        }
      },
    })
    response.status(200).json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    if (error instanceof ProvisioningDuplicateEmailError) {
      request.log.error({ code: error.code, count: error.count }, 'Multiple internal accounts match verified email')
      response.status(409).json({ error: { code: error.code, message: error.message } })
      return
    }
    if (error instanceof ProvisioningConflictError) {
      request.log.warn({ code: error.code }, 'Account mapping conflict detected')
      response.status(409).json({ error: { code: error.code, message: error.message } })
      return
    }
    request.log.error({ code: typeof error === 'object' && error !== null && 'code' in error ? error.code : 'unknown' }, 'CareerOS internal-user provisioning failed')
    response.status(503).json({ error: { code: 'PROVISIONING_UNAVAILABLE', message: 'Your application account could not be provisioned right now.' } })
  }
})

