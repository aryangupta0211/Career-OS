# CareerOS authentication architecture

## Trust boundaries

The browser uses one persisted Supabase client (`src/lib/supabase.ts`). It sends only the current access token to the API via `Authorization: Bearer <token>`. The Express backend independently verifies that token with Supabase Auth on every protected request (`backend/src/auth/identity.ts`) and derives identity strictly from the verified identity payload. Browser-provided user IDs, emails, query parameters, and request body attributes are never used for authentication or authorization.

## Canonical identity resolution (6 cases)

Identity resolution in `backend/src/auth/provisioning.ts` guarantees data preservation, ownership security, and concurrency safety:

### Case 1: Existing internal account, same Supabase Auth ID
- Matches `findBySupabaseAuthId(identity.id)`.
- Reuses the existing internal `User` record idempotently.
- Updates verified email if it changed in Supabase.
- Preserves all relational data (applications, companies, contacts, tasks, events, Vault files).
- Proceeds to the dashboard.

### Case 2: Existing internal account, no Supabase Auth ID (`supabaseAuthId == null`)
- Verified, confirmed email returned by Supabase is normalized (trimmed, lowercase).
- Matches unique legacy internal record (`supabaseAuthId === null`).
- Atomically links `supabaseAuthId = identity.id` via conditional CAS (`WHERE id = userId AND supabaseAuthId IS NULL`).
- Concurrency races catch `P2002` and re-read `findBySupabaseAuthId(identity.id)`.
- Preserves all legacy user data.
- Proceeds to the dashboard.

### Case 3: No existing internal account
- Neither `findBySupabaseAuthId` nor `findByVerifiedEmail` finds a record.
- Provisions exactly one new internal `User` record with `supabaseAuthId: identity.id`, `email`, and `name`.
- Concurrent duplicate provisioning races catch `P2002` and re-read `findBySupabaseAuthId(identity.id)`.
- Proceeds to the dashboard.

### Case 4: Existing internal account already linked to a different Supabase Auth ID
- Internal user has an existing `supabaseAuthId !== identity.id`.
- The system checks whether that existing `supabaseAuthId` is an active user in Supabase Auth via `repository.isSupabaseAuthIdActive(storedAuthId)` using the Supabase admin client:
  - **Sub-case 4A (Active ID in Supabase Auth):** The stored ID belongs to a live, active Supabase Auth account. To prevent account hijacking, it is **never automatically overwritten**. The request is rejected with `409 Conflict` (`code: 'ACCOUNT_MAPPING_CONFLICT'`), directing the user to sign in with their original method or complete account recovery.
  - **Sub-case 4B (Orphaned ID deleted from Supabase Auth):** Supabase explicitly confirms `404 User not found`. The stored ID is a dead pointer from an earlier reset/deletion of Supabase Auth users. The incoming identity has the confirmed, verified email and is the sole live Supabase account for it. The system safely rebinds `supabaseAuthId = identity.id` using atomic CAS (`WHERE id = userId AND supabaseAuthId = expectedCurrentAuthId`).
- Proceeds to the dashboard with all historical user data preserved.

### Case 5: Duplicate internal users with the same email
- Queries `findDuplicatesByVerifiedEmail` with case-insensitive normalization.
- If multiple records exist (`matches.length > 1`), the system refuses to guess, select an arbitrary record, or merge automatically.
- Logs sanitized diagnostics (`count`, domain) without leaking PII.
- Rejects with `409 Conflict` (`code: 'ACCOUNT_DUPLICATE_CONFLICT'`), alerting the user that support reconciliation is required.

### Case 6: Concurrent OAuth callbacks
- Handled at the database level via unique constraints on `supabaseAuthId` and `email`, plus atomic CAS queries (`updateMany`).
- Concurrency collisions catch Prisma unique constraint errors (`P2002`) and re-read the canonical record, ensuring strict idempotency and zero duplicate accounts.

## Browser and routing flows

- **Email signup:** Calls Supabase `signUp`, persists `full_name` in user metadata, and instructs user to check their email for confirmation.
- **Email login & Google OAuth:** Uses Supabase client; preserves internal destination route via `next` query parameter; redirects back safely via `/auth/confirm`.
- **Password recovery & reset:** Supabase recovery email routes to `/auth/recovery`; updates password authenticated via `client.auth.updateUser({ password })`.
- **Session management:** Single `onAuthStateChange` listener in `AuthProvider`, synchronizing sessions and triggering background provisioning before rendering protected routes.
- **Frontend route protection:** `RequireAuth` displays tailored, actionable UI for conflicts, duplicates, unverified emails, or server unavailability, with safe retry or sign-in routing.
- **Logout:** Calls `client.auth.signOut()`, clears user query caches, and redirects to public login.
