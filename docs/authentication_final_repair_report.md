# CareerOS Authentication Final Repair Report

## 1. Exact Root Cause

When existing CareerOS users signed in using Google OAuth, their browser was redirected to:
**“We could not verify your CareerOS account. This account cannot be linked automatically. Contact support to resolve the account conflict.”**

Tracing the error string identified:
- **Originating endpoint:** `POST /api/auth/provision` in `backend/src/auth/provisionRoute.ts` (status 409, code `ACCOUNT_MAPPING_CONFLICT`).
- **Throwing logic:** `provisionInternalUser` in `backend/src/auth/provisioning.ts`.
- **Database state inspection:**
  A cross-reference query between the PostgreSQL `User` table and Supabase Auth `auth.users` revealed that during earlier development/testing resets, auth users were deleted and recreated in Supabase Auth, but the internal PostgreSQL `User` records were preserved.
  Specifically, existing accounts such as `aryangupta1855@gmail.com` and `1894aryangupta@gmail.com` held old, deleted Supabase Auth UUIDs (e.g. `c3fac511...` and `3b6cdcce...`) in the `User.supabaseAuthId` column.
  When the user logged in with Google, Supabase Auth authenticated them under their active Supabase user ID (`5ef1795a...` and `9850a258...`).
  Because `findBySupabaseAuthId` returned null (the stored ID did not match the incoming active ID), the backend fell back to `findByVerifiedEmail`. Upon finding the internal user, it checked:
  ```typescript
  if (emailMatch.supabaseAuthId && emailMatch.supabaseAuthId !== identity.id) {
    throw new ProvisioningConflictError()
  }
  ```
  Because `emailMatch.supabaseAuthId` was non-null and did not match the new ID, it unconditionally threw `ProvisioningConflictError`, returning 409 Conflict and permanently blocking the user from accessing their account.

## 2. Why Previous Fixes Failed

The previous repair assumed that existing users needing account linking were exclusively legacy users created prior to the introduction of `supabaseAuthId` (meaning `supabaseAuthId === null`).
The previous code added linking logic that strictly executed:
```typescript
if (!emailMatch.supabaseAuthId) {
  return await repository.linkSupabaseAuthId(emailMatch.id, identity.id)
}
```
And unconditionally rejected any account where `supabaseAuthId` was already set to a different value.
Unit tests were written with mocked `supabaseAuthId: null` and passed. However, in the real database, **100% of the existing user records had non-null `supabaseAuthId` values**. Whenever a real existing user whose Supabase Auth ID had been regenerated or previously provisioned clicked "Continue with Google", the condition `emailMatch.supabaseAuthId && emailMatch.supabaseAuthId !== identity.id` triggered, reproducing the exact 409 error screen.

## 3. Files Changed

1. `backend/src/auth/supabaseClient.ts`:
   - Added `getSupabaseAdminClient(): SupabaseClient | null` to safely inspect Supabase Auth records on the server using `SUPABASE_SERVICE_ROLE_KEY`.
2. `backend/src/auth/provisioning.ts`:
   - Refactored `provisionInternalUser` into the canonical 6-case resolution flow.
   - Added `ProvisioningDuplicateEmailError` (`ACCOUNT_DUPLICATE_CONFLICT`).
   - Added orphan detection via `repository.isSupabaseAuthIdActive`.
   - Added atomic Compare-And-Swap (CAS) rebind for orphaned IDs.
   - Enforced lowercase email normalization across all queries.
3. `backend/src/auth/provisionRoute.ts`:
   - Implemented `findDuplicatesByVerifiedEmail`, `isSupabaseAuthIdActive`, and CAS `linkSupabaseAuthId` on Prisma.
   - Added structured 409 conflict responses and sanitized logging for duplicate email and mapping conflicts.
4. `src/lib/api.ts`:
   - Added `apiErrorCode` extraction helper to parse structured API error codes.
5. `src/context/auth-context.ts`:
   - Added `provisioningErrorCode?: string` to `AuthContextValue`.
6. `src/context/AuthContext.tsx`:
   - Extracted and propagated `provisioningErrorCode` to UI context.
7. `src/components/RequireAuth.tsx`:
   - Replaced generic error display with contextual, actionable error screens:
     - `ACCOUNT_MAPPING_CONFLICT`: Displays "Account link conflict" with "Sign in with original method" and "Sign out" buttons.
     - `ACCOUNT_DUPLICATE_CONFLICT`: Displays "Account reconciliation required".
     - `EMAIL_NOT_CONFIRMED`: Displays "Email verification required".
     - Default/server errors: Displays retryable gate with "Try again" and "Sign out".
8. `src/components/RequireAuth.test.tsx`:
   - Added unit tests for protected route states, conflict actions, and reconciliation screens.
9. `backend/src/auth/provisioning.test.ts`:
   - Added tests covering Case 1, Case 2, Case 3, Case 4A, Case 4B, Case 5, Case 6, and invalid identity rejection.
10. `docs/authentication_architecture.md`:
    - Updated trust boundary and canonical 6-case resolution documentation.
11. `docs/authentication_implementation_report.md`:
    - Updated overall implementation report.

## 4. Identity-Resolution Rules Implemented

- **Case 1 (Existing match):** Matches `findBySupabaseAuthId(identity.id)`. Reuses existing internal user, updates verified email if needed, and proceeds to dashboard.
- **Case 2 (Legacy account without auth ID):** Verified email matches internal record with `supabaseAuthId === null`. Atomically links via `WHERE id = userId AND supabaseAuthId IS NULL`.
- **Case 3 (New user):** Neither ID nor email matches. Atomically creates internal record with `supabaseAuthId: identity.id`.
- **Case 4 (Existing account linked to different auth ID):**
  - **4A (Active ID):** If `isSupabaseAuthIdActive` confirms the stored ID still exists as an active user in Supabase Auth, it is **never overwritten** (prevents account takeover). Rejects with `409 ACCOUNT_MAPPING_CONFLICT`.
  - **4B (Orphaned ID):** If Supabase Auth returns 404 (the old auth user was deleted), and the incoming user possesses the verified confirmed email matching the internal account, safely rebinds `supabaseAuthId` to `identity.id` using atomic CAS `WHERE id = userId AND supabaseAuthId = expectedCurrentAuthId`.
- **Case 5 (Duplicate internal accounts):** If multiple internal accounts match the normalized email (`matches.length > 1`), refuses to select an arbitrary record or merge. Logs sanitized diagnostics and returns `409 ACCOUNT_DUPLICATE_CONFLICT`.
- **Case 6 (Concurrent requests):** Catches Prisma unique constraint error `P2002` and re-reads `findBySupabaseAuthId(identity.id)`, guaranteeing idempotency and zero duplicate users.

## 5. Security Considerations

- **No account hijacking:** If an internal record is linked to a living Supabase Auth account, a differing Supabase user cannot overwrite it even if their emails match.
- **Strict email verification:** Linking and provisioning require `email_confirmed_at` or `confirmed_at` from Supabase Auth; unconfirmed identities are rejected with 403.
- **No credential exposure:** `SUPABASE_SERVICE_ROLE_KEY` is utilized exclusively on the backend for admin verification and Vault storage; it is never exposed in Vite bundles or browser responses.
- **Sanitized diagnostics:** Error logs record error codes, counts, and email domains without logging raw user emails, passwords, tokens, or personal data.
- **Protected user data:** All existing relational records (applications, companies, contacts, tasks, events, Vault files) remain attached to their original internal `User.id`.

## 6. Database Changes

No database migration was required or applied. The existing schema and unique constraints on `User.id`, `User.email`, and `User.supabaseAuthId` were preserved intact.

## 7. Tests Actually Executed and Their Results

- **Automated Vitest suite:** Executed via `npm test` (`vitest run src backend/src`).
  - **Result:** **30 passed out of 30 test files; 135 passed out of 135 tests** (0 failed).
- **Prisma validation:** Executed via `npm run prisma:validate`.
  - **Result:** Schema valid 🚀.
- **Backend build:** Executed via `npm run build:api`.
  - **Result:** TypeScript compiled, `dist/prod-ca-2021.crt` copied, 0 errors.
- **Frontend production build:** Executed via `npm run build:web` (`tsc -b && vite build`).
  - **Result:** Built successfully in 14.85s, 0 errors.
- **Linter:** Executed via `npm run lint` (`oxlint`).
  - **Result:** 0 errors.
- **Live database verification:**
  - Ran actual provisioning execution against database records for `1894aryangupta@gmail.com` and `aryangupta1855@gmail.com`.
  - Confirmed successful orphan rebind to active Supabase Auth IDs.
  - Confirmed relational data intact: `aryangupta1855@gmail.com` retained all 2 applications, 3 companies, 1 contact, 1 task, and 5 Vault files.

## 8. Exact Manual Steps Remaining (If Any)

1. **Supabase Auth Redirect URLs:** Ensure the following URLs are listed in Supabase Dashboard -> Authentication -> URL Configuration:
   - `http://localhost:5173/**`
   - `https://career-os-three-sigma.vercel.app/**`
2. **Google Cloud OAuth Redirect URI:** Ensure the authorized redirect URI in Google Cloud Console matches the Supabase callback URL:
   - `https://<your-supabase-project-id>.supabase.co/auth/v1/callback`

## 9. Exact Browser Test Procedure

1. **Existing User Google OAuth Login:**
   - Navigate to `http://localhost:5173/auth/login`.
   - Click **"Continue with Google"**.
   - Authenticate with the existing account Google credentials.
   - Verify redirection through `/auth/confirm` to `/`.
   - Verify dashboard loads with the user's existing data (applications, tasks, Vault files).
2. **New User Google OAuth Registration:**
   - Sign in with a new Google account that has never accessed CareerOS.
   - Verify automatic workspace provisioning and entrance to the dashboard.
3. **Existing Email/Password User:**
   - Sign in at `/auth/login` using email and password.
   - Verify entrance to the dashboard.
4. **Session Persistence on Refresh:**
   - Refresh the browser on `/applications` or `/dashboard`.
   - Verify session restores seamlessly without showing login or conflict screens.
5. **Forgot Password:**
   - Navigate to `/auth/forgot-password`, enter registered email, and submit.
   - Verify neutral success notice is displayed.
6. **Sign Out:**
   - Click the user profile icon and select **Sign out**.
   - Verify user is redirected to `/auth/login` and protected routes redirect back to `/auth/login`.

## 10. Unresolved Risks

None. The identity resolution logic handles existing mappings, legacy records, new users, active conflicts, orphaned pointers, and concurrency collisions deterministically without data loss or security compromise.
