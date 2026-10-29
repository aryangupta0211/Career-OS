export interface VerifiedSupabaseIdentity {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  confirmed_at?: string | null
  user_metadata?: Record<string, unknown>
}

export interface InternalUserMapping {
  id: string
  email: string
  name: string
}

export interface IdentityVerifier {
  getUser(token: string): Promise<{
    data: { user: VerifiedSupabaseIdentity | null }
    error: { status?: number } | null
  }>
}

export interface IdentityLookup {
  findBySupabaseAuthId(id: string): Promise<InternalUserMapping | null>
  updateVerifiedEmail(userId: string, email: string): Promise<InternalUserMapping>
}

export type IdentityResult =
  | { ok: true; token: string; identity: VerifiedSupabaseIdentity }
  | { ok: false; status: 401 | 403 | 429 | 503; code: string; message: string }

function failure(status: 401 | 403 | 429 | 503, code: string, message: string): IdentityResult {
  return { ok: false, status, code, message }
}

export async function verifySupabaseBearer(authorization: string | undefined, verifier: IdentityVerifier): Promise<IdentityResult> {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!match) return failure(401, 'UNAUTHORIZED', 'A valid bearer token is required.')

  try {
    const result = await verifier.getUser(match[1]!)
    if (result.error) {
      if (result.error.status === 429) return failure(429, 'AUTH_RATE_LIMITED', 'Authentication verification is temporarily rate limited.')
      if (result.error.status === 400 || result.error.status === 401 || result.error.status === 403) {
        return failure(401, 'UNAUTHORIZED', 'The bearer token is invalid or expired.')
      }
      return failure(503, 'AUTH_PROVIDER_UNAVAILABLE', 'Authentication verification is temporarily unavailable.')
    }

    const identity = result.data.user
    if (!identity) return failure(401, 'UNAUTHORIZED', 'The bearer token is invalid or expired.')
    if (!identity.email?.trim()) return failure(403, 'EMAIL_REQUIRED', 'A confirmed email address is required for CareerOS.')
    if (!identity.email_confirmed_at && !identity.confirmed_at) {
      return failure(403, 'EMAIL_NOT_CONFIRMED', 'Confirm your email before accessing CareerOS.')
    }
    return { ok: true, token: match[1]!, identity }
  } catch {
    return failure(503, 'AUTH_PROVIDER_UNAVAILABLE', 'Authentication verification is temporarily unavailable.')
  }
}

export async function resolveInternalUser(
  identity: VerifiedSupabaseIdentity,
  lookup: IdentityLookup,
): Promise<{ ok: true; user: InternalUserMapping } | { ok: false; status: 403 | 409 | 503; code: string; message: string }> {
  try {
    let user = await lookup.findBySupabaseAuthId(identity.id)
    if (!user) return { ok: false, status: 403, code: 'ACCOUNT_NOT_PROVISIONED', message: 'This account is not provisioned for CareerOS.' }
    if (identity.email && identity.email !== user.email) {
      try {
        user = await lookup.updateVerifiedEmail(user.id, identity.email)
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
          return { ok: false, status: 409, code: 'ACCOUNT_MAPPING_CONFLICT', message: 'This account cannot be linked automatically. Contact support to resolve the account conflict.' }
        }
        throw error
      }
    }
    return { ok: true, user }
  } catch {
    return { ok: false, status: 503, code: 'DATABASE_UNAVAILABLE', message: 'The application account could not be verified right now.' }
  }
}
