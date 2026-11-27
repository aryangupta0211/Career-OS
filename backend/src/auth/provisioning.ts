import type { InternalUserMapping, VerifiedSupabaseIdentity } from './identity.js'

export type ProvisionedUser = InternalUserMapping & { supabaseAuthId?: string | null }

export interface ProvisioningRepository {
  findBySupabaseAuthId(id: string): Promise<ProvisionedUser | null>
  findDuplicatesByVerifiedEmail(email: string): Promise<ProvisionedUser[]>
  findByVerifiedEmail(email: string): Promise<ProvisionedUser | null>
  linkSupabaseAuthId(userId: string, supabaseAuthId: string, expectedCurrentAuthId?: string | null): Promise<ProvisionedUser>
  create(input: { supabaseAuthId: string; email: string; name: string }): Promise<ProvisionedUser>
  updateVerifiedEmail(userId: string, email: string): Promise<ProvisionedUser>
  isSupabaseAuthIdActive?(id: string): Promise<boolean>
}

export class ProvisioningConflictError extends Error {
  readonly code = 'ACCOUNT_MAPPING_CONFLICT'

  constructor(message = 'We found an existing account that needs secure verification before it can be linked. Sign in using your original method or follow the account recovery instructions.') {
    super(message)
    this.name = 'ProvisioningConflictError'
  }
}

export class ProvisioningDuplicateEmailError extends Error {
  readonly code = 'ACCOUNT_DUPLICATE_CONFLICT'
  readonly count: number

  constructor(count: number, message = 'Multiple accounts exist for this email address. Please contact support to reconcile your account data.') {
    super(message)
    this.name = 'ProvisioningDuplicateEmailError'
    this.count = count
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
  const email = identity.email?.trim().toLowerCase()
  if (!email || (!identity.email_confirmed_at && !identity.confirmed_at)) {
    throw new Error('Only a confirmed Supabase identity with an email can be provisioned.')
  }

  // Case 1: Existing internal account, same Supabase Auth ID
  const existing = await repository.findBySupabaseAuthId(identity.id)
  if (existing) return syncVerifiedEmail(existing, email, repository)

  // Case 5: Duplicate internal users with the same email
  const matches = await repository.findDuplicatesByVerifiedEmail(email)
  if (matches.length > 1) {
    throw new ProvisioningDuplicateEmailError(matches.length)
  }
  const emailMatch = matches[0] ?? (await repository.findByVerifiedEmail(email))

  if (emailMatch) {
    // If the account already matches the incoming identity, sync and return
    if (emailMatch.supabaseAuthId === identity.id) {
      return syncVerifiedEmail(emailMatch, email, repository)
    }

    // Case 2: Existing internal account, no Supabase Auth ID (legacy record)
    if (!emailMatch.supabaseAuthId) {
      try {
        return await repository.linkSupabaseAuthId(emailMatch.id, identity.id, null)
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error
        const raced = await repository.findBySupabaseAuthId(identity.id)
        if (raced) return syncVerifiedEmail(raced, email, repository)
        throw new ProvisioningConflictError()
      }
    }

    // Case 4: Existing internal account already linked to a different Supabase Auth ID
    // Check whether that other ID is an active user in Supabase Auth.
    const isOtherIdActive = repository.isSupabaseAuthIdActive
      ? await repository.isSupabaseAuthIdActive(emailMatch.supabaseAuthId)
      : true // Fail-safe to true if verifier is unavailable

    if (isOtherIdActive) {
      // Sub-case 4A: Genuine conflict with an existing active Supabase account. Do not overwrite.
      throw new ProvisioningConflictError()
    }

    // Sub-case 4B: The stored Supabase Auth ID is orphaned/deleted from Supabase Auth.
    // The incoming identity has the verified, confirmed matching email and is the only
    // active Supabase account for it. Rebind the orphaned mapping safely via atomic CAS.
    try {
      return await repository.linkSupabaseAuthId(emailMatch.id, identity.id, emailMatch.supabaseAuthId)
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      const raced = await repository.findBySupabaseAuthId(identity.id)
      if (raced) return syncVerifiedEmail(raced, email, repository)
      throw new ProvisioningConflictError()
    }
  }

  // Case 3: No existing internal account - provision a new record
  try {
    return await repository.create({
      supabaseAuthId: identity.id,
      email,
      name: displayName(identity, email),
    })
  } catch (error) {
    // Case 6: Concurrent race handling
    if (!isUniqueConstraintError(error)) throw error
    const raced = await repository.findBySupabaseAuthId(identity.id)
    if (raced) return syncVerifiedEmail(raced, email, repository)
    throw new ProvisioningConflictError()
  }
}

async function syncVerifiedEmail(user: ProvisionedUser, email: string, repository: ProvisioningRepository) {
  if (user.email.toLowerCase() === email) return user
  try {
    return await repository.updateVerifiedEmail(user.id, email)
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new ProvisioningConflictError()
    throw error
  }
}

