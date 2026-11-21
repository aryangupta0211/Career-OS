import type { InternalUserMapping, VerifiedSupabaseIdentity } from './identity.js'

export type ProvisionedUser = InternalUserMapping

export interface ProvisioningRepository {
  findBySupabaseAuthId(id: string): Promise<ProvisionedUser | null>
  create(input: { supabaseAuthId: string; email: string; name: string }): Promise<ProvisionedUser>
  updateVerifiedEmail(userId: string, email: string): Promise<ProvisionedUser>
}

export class ProvisioningConflictError extends Error {
  readonly code = 'ACCOUNT_MAPPING_CONFLICT'

  constructor() {
    super('This identity cannot be provisioned without conflicting with an existing application account.')
    this.name = 'ProvisioningConflictError'
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

function displayName(identity: VerifiedSupabaseIdentity, email: string) {
  const metadataName = identity.user_metadata?.full_name
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim().slice(0, 100)
  return email.split('@')[0]!.slice(0, 100)
}

export async function provisionInternalUser(
  identity: VerifiedSupabaseIdentity,
  repository: ProvisioningRepository,
): Promise<ProvisionedUser> {
  const email = identity.email?.trim()
  if (!email || (!identity.email_confirmed_at && !identity.confirmed_at)) {
    throw new Error('Only a confirmed Supabase identity with an email can be provisioned.')
  }

  const existing = await repository.findBySupabaseAuthId(identity.id)
  if (existing) return syncVerifiedEmail(existing, email, repository)

  try {
    return await repository.create({
      supabaseAuthId: identity.id,
      email,
      name: displayName(identity, email),
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const raced = await repository.findBySupabaseAuthId(identity.id)
    if (raced) return syncVerifiedEmail(raced, email, repository)
    throw new ProvisioningConflictError()
  }
}

async function syncVerifiedEmail(user: ProvisionedUser, email: string, repository: ProvisioningRepository) {
  if (user.email === email) return user
  try {
    return await repository.updateVerifiedEmail(user.id, email)
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new ProvisioningConflictError()
    throw error
  }
}
