import { Router } from 'express'
import { getPrismaClient } from '../db/client.js'
import { verifySupabaseBearer } from './identity.js'
import { getSupabaseAuthClient } from './supabaseClient.js'
import { ProvisioningConflictError, provisionInternalUser } from './provisioning.js'

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
        select: { id: true, email: true, name: true },
      }),
      create: (input) => prisma.user.create({ data: input, select: { id: true, email: true, name: true } }),
      updateVerifiedEmail: (userId, email) => prisma.user.update({
        where: { id: userId },
        data: { email },
        select: { id: true, email: true, name: true },
      }),
    })
    response.status(200).json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    if (error instanceof ProvisioningConflictError) {
      response.status(409).json({ error: { code: error.code, message: 'This account cannot be linked automatically. Contact support to resolve the account conflict.' } })
      return
    }
    request.log.error({ code: typeof error === 'object' && error !== null && 'code' in error ? error.code : 'unknown' }, 'CareerOS internal-user provisioning failed')
    response.status(503).json({ error: { code: 'PROVISIONING_UNAVAILABLE', message: 'Your application account could not be provisioned right now.' } })
  }
})
