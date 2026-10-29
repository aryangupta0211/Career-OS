import type { RequestHandler } from 'express'
import { getPrismaClient } from '../db/client.js'
import { resolveInternalUser, verifySupabaseBearer } from './identity.js'
import { getSupabaseAuthClient } from './supabaseClient.js'

export const requireAuth: RequestHandler = async (request, response, next) => {
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

  let prisma
  try {
    prisma = getPrismaClient()
  } catch {
    response.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The application account could not be verified right now.' } })
    return
  }

  const result = await resolveInternalUser(verified.identity, {
    findBySupabaseAuthId: (id) => prisma.user.findUnique({
      where: { supabaseAuthId: id },
      select: { id: true, email: true, name: true },
    }),
    updateVerifiedEmail: (userId, email) => prisma.user.update({
      where: { id: userId },
      data: { email },
      select: { id: true, email: true, name: true },
    }),
  })
  if (!result.ok) {
    response.status(result.status).json({ error: { code: result.code, message: result.message } })
    return
  }
  request.auth = { userId: result.user.id, email: result.user.email, name: result.user.name }
  next()
}
