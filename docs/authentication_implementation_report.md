# CareerOS authentication implementation report

## Initial audit

CareerOS uses a single browser Supabase client (`src/lib/supabase.ts`) with persisted, refreshed sessions and URL callback detection. `AuthProvider` owns session initialization, subscribes once to Supabase authentication events, provisions the internal Prisma `User` through `/api/auth/provision`, and clears user-specific query caches on identity changes or logout. Express independently verifies every bearer token through Supabase Auth before resolving `User.supabaseAuthId`.

Existing email/password registration, login, confirmation, password recovery, reset, protected routes, idempotent provisioning, and ownership filtering were preserved. The missing browser flow was Google OAuth initiation and preservation of the requested protected destination.

## Root cause analysis of existing user Google OAuth failure

The failure observed when existing CareerOS users authenticated with Google stemmed from:
1. Historical deletion or recreation of Supabase Auth users during development, leaving orphaned `supabaseAuthId` values in the PostgreSQL `User` table that no longer existed in Supabase Auth.
2. The previous provisioning implementation assumed that only legacy records with `supabaseAuthId === null` could be linked. If an internal record had any non-null `supabaseAuthId !== identity.id`, it unconditionally threw `ProvisioningConflictError` with code `ACCOUNT_MAPPING_CONFLICT`.
3. The atomic CAS update query only checked `WHERE supabaseAuthId IS NULL`, making it impossible to safely rebind an orphaned pointer even when the user proved verified ownership of the confirmed email in Supabase Auth.
4. As a result, when real users whose accounts were created prior to the auth reset attempted Google OAuth (or password login under a recreated auth ID), `/api/auth/provision` returned 409, and `RequireAuth` displayed:
   *"We could not verify your CareerOS account. This account cannot be linked automatically. Contact support to resolve the account conflict."*

## Final canonical identity resolution

Provisioning in `backend/src/auth/provisioning.ts` now enforces the canonical 6-case resolution:

1. **Case 1 (Existing match):** Matches `findBySupabaseAuthId(identity.id)`. Reuses record and syncs verified email.
2. **Case 2 (Legacy record without auth ID):** Matches verified email where `supabaseAuthId IS NULL`. Atomically links via CAS.
3. **Case 3 (New user):** Provisions a new `User` record idempotently.
4. **Case 4 (Existing record with differing auth ID):**
   - Verifies whether the existing stored ID is active in Supabase Auth using `isSupabaseAuthIdActive` via the admin client.
   - If active in Supabase: safely rejects with `ACCOUNT_MAPPING_CONFLICT` (409) to prevent account hijacking.
   - If orphaned (Supabase returns 404 / User not found): safely rebinds `supabaseAuthId` to the verified incoming identity via atomic CAS `WHERE id = userId AND supabaseAuthId = expectedCurrentAuthId`.
5. **Case 5 (Duplicate internal accounts):** Detects multiple records with the same normalized email via `findDuplicatesByVerifiedEmail`. Refuses to guess or merge; logs sanitized diagnostics and returns `ACCOUNT_DUPLICATE_CONFLICT` (409).
6. **Case 6 (Concurrent callbacks):** Concurrency collisions catch Prisma unique constraint errors (`P2002`) and re-read the canonical record, ensuring race-free execution.

## Files changed

- `backend/src/auth/supabaseClient.ts`: added `getSupabaseAdminClient` for secure server-side validation.
- `backend/src/auth/provisioning.ts`: implemented complete 6-case canonical identity resolution, orphan rebind, active conflict prevention, and duplicate email detection.
- `backend/src/auth/provisionRoute.ts`: wired `findDuplicatesByVerifiedEmail`, `isSupabaseAuthIdActive`, atomic CAS `linkSupabaseAuthId`, and sanitized logging.
- `src/lib/api.ts`: added `apiErrorCode` helper.
- `src/context/auth-context.ts`: added `provisioningErrorCode` to `AuthContextValue`.
- `src/context/AuthContext.tsx`: exposed `provisioningErrorCode` and passed structured error codes to state.
- `src/components/RequireAuth.tsx`: replaced generic error screen with actionable states for conflicts, duplicates, unverified emails, and server unavailability.
- `src/components/RequireAuth.test.tsx`: added unit tests for actionable gate states.
- `backend/src/auth/provisioning.test.ts`: expanded test suite covering all 6 cases and race conditions.
- `docs/authentication_architecture.md`: updated architectural trust boundaries and 6-case specification.
- `docs/authentication_final_repair_report.md`: comprehensive technical repair report.

## Required configuration (names only)

Frontend/Vercel: `VITE_DATA_MODE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

Backend host: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Supabase Auth redirect URLs: `http://localhost:5173/**`, `https://career-os-three-sigma.vercel.app/**`.
Google Cloud authorized redirect URI: `https://<project-id>.supabase.co/auth/v1/callback`.

## Verification status

- Automated tests: 30 test files, 135 tests passed.
- Prisma schema validation: passed.
- Backend build: passed (`tsc -p tsconfig.json`).
- Frontend production build: passed (`tsc -b && vite build` in 14.85s, 0 errors).
- Linter: passed (0 errors).
- Live database verification: tested on real records (`aryangupta1855@gmail.com` and `1894aryangupta@gmail.com`), successfully verified data preservation and orphan rebind.
