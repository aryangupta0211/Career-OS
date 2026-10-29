# Authentication & Authorization Design

Status: approved design; authentication foundation and protected record routes are implemented. The `User.supabaseAuthId` field and migration are applied. The two feature migrations were applied on 2026-10-29 after explicit project-owner approval; read-only migration status and Prisma schema diff confirm the database is current. Runtime authenticated CRUD validation remains pending.

## 1. Current-state findings from the repository

Demo mode remains the default. API mode is available through `VITE_DATA_MODE=api` and uses Supabase authentication with user-scoped routes.

- Frontend: `src/App.tsx` selects `DemoCareerDataProvider` by default and selects `ApiCareerDataProvider` only in API mode. Demo data remains in browser `localStorage` under `careeros-demo-v1`; API mode does not silently import or link those records.
- Backend: `api/src/app.ts` exposes `/api/health`, `/api/auth/provision`, and authenticated `/api/data` routes. Data operations derive `userId` from the verified internal mapping, validate related record ownership, and scope reads, updates, and deletes.
- Database: `User.supabaseAuthId` is a nullable unique PostgreSQL UUID. The migrations for application preparation notes, task category, and contact tags were applied on 2026-10-29; read-only status confirms all four migrations are applied and the Prisma schema diff is empty.
- Supabase configuration: the browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the API uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The server verifies request tokens with `supabase.auth.getUser(token)` using the least-privileged supported configuration. A service-role key is not required solely for token verification.
- Authentication and provisioning: the API requires confirmed email on each protected request, resolves internal users by the verified Supabase UUID only, and rejects unprovisioned mappings rather than creating them implicitly. A dedicated provisioning endpoint handles confirmed identities; email uniqueness conflicts are not automatically linked.

The approved architecture below remains the contract for ongoing changes. Database schema connectivity and migrations are verified, but the API has not passed authenticated live integration testing.

## 2. Goals and design principles

1. Supabase Auth is the source of truth for credentials, email confirmation, session management, password reset, and token lifecycle.
2. The internal Prisma `User` table is the application identity mapping layer. It must not be trusted unless it is resolved from a verified Supabase identity.
3. Ownership is enforced server-side from the authenticated internal user ID, never from a client-supplied `userId`, `ownerId`, `companyId`, or similar request field.
4. Protected endpoints validate tokens on every request and reject invalid, expired, unconfirmed, or mismatched identities with a consistent 401/403/404 response model.
5. The app must remain intentionally minimal and production-conscious: use the vendor-supported auth session behaviors and avoid building a second custom auth system.

## 3. Authentication architecture

### A. Responsibilities

#### Supabase Auth
Supabase Auth owns:
- email/password sign-up and sign-in
- email confirmation flow
- password reset and recovery
- session creation and refresh
- JWT issuance and expiry rules
- account disablement and recovery status
- browser-safe session storage and session restoration

It does not own the application’s business-level ownership rules; those remain in the Express + Prisma layer.

#### React frontend + Supabase browser client
The frontend is responsible for:
- creating the browser client with `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- rendering sign-up, sign-in, confirming email, password reset, and recovery states
- using the Supabase session to obtain the current access token
- storing the session via the SDK’s supported storage strategy (not manually in `localStorage`)
- attaching `Authorization: Bearer <token>` to protected API requests
- redirecting unauthenticated users away from protected routes
- restoring auth state after refresh via the SDK session lifecycle

The frontend must never store a service-role key or any auth secret in browser code.

#### Express API
The API is responsible for:
- accepting bearer tokens from the request
- verifying the token server-side using a trusted Supabase validation mechanism
- resolving the verified Supabase user UUID to the internal application `User.id` using `User.supabaseAuthId`
- attaching the authenticated internal user to a trusted request context (for example `req.auth.userId` or `req.userId`)
- applying ownership checks in every service/repository operation before reading, updating, or deleting records
- returning stable, explicit auth and authorization errors

The API must not trust client-supplied identity claims. It must always derive identity from a cryptographically verified token.

#### Prisma ORM and PostgreSQL database
Prisma and PostgreSQL enforce the application’s data model and relationships. They provide:
- a unique `User.supabaseAuthId` identity mapping
- required `userId` ownership on every domain record
- composite unique/relationship constraints that prevent cross-user associations
- server-side authorization checks at the repository/service layer

For initial scope, the app should keep auth enforcement in the Express layer and service logic, not in a public database access model.

### B. Selected verification method

Recommended choice for this repo: validate the bearer token through Supabase’s own verification endpoint/client (`supabase.auth.getUser(token)`) instead of manually decoding a JWT.

Why this is a good fit here:
- it is the supported, vendor-backed verification path for Supabase-issued tokens
- it handles token expiry and malformed token states consistently
- it avoids trusting raw JWT claims without signature validation
- it matches the requested architecture and the current project is not yet using a custom JWT stack

Implementation pattern:
- the frontend obtains a valid Supabase session and sends the access token in `Authorization: Bearer <token>`
- the API creates a server-side Supabase client using `SUPABASE_URL` and the least-privileged supported key (the publishable key, or legacy anon key, where applicable), with the request access token passed to `getUser(token)`
- the server calls `supabase.auth.getUser(token)` on the request token
- if Supabase rejects the token as invalid or expired, respond with `401 Unauthorized`; if verification is temporarily unavailable, fail closed with a service error such as `503 Service Unavailable` and do not continue to database access
- if the token is valid, read `user.id` from the verified Supabase identity and resolve the internal application `User` row using `supabaseAuthId`

Important constraints:
- use the least-privileged supported server configuration for token verification; do not require or use a service-role key solely for `getUser(token)`
- a privileged credential may be introduced only for a separately identified operation that specifically requires elevated Supabase Auth permissions; that is outside this design's token-verification flow
- never decode a JWT blob directly and trust `sub`, `email`, or any other claim without server-side verification
- never accept identity from a request body or query string
- never add token validation logic that bypasses Supabase verification for convenience
- fail closed on upstream verification failures: rejected credentials are `401`, while temporary verification-service failures are `503`; neither case may proceed as authenticated

### C. Intended request flow

1. The frontend signs the user up or logs in through Supabase Auth.
2. Supabase manages email confirmation, password reset, and the session lifecycle.
3. The frontend receives the session and extracts the current access token.
4. The frontend calls protected endpoints with `Authorization: Bearer <access-token>`.
5. Express verifies the token using a supported Supabase mechanism.
6. Express checks the verified identity's email-confirmation status server-side, then resolves the internal `User.id` using `User.supabaseAuthId`; only the designated first-time provisioning flow may create a missing mapping.
7. Express stores the trusted internal user ID on the request context.
8. Repositories and service functions scope all database operations to `req.auth.userId`.

## 4. Signup and internal user provisioning

### A. Safe flow

The flow should be:
1. User signs up with email/password in Supabase Auth.
2. Supabase creates the auth user and the email confirmation workflow begins.
3. The app’s UI checks the Supabase session and displays the confirmation state, but this is only a UX aid and does not authorize API access.
4. The server verifies the token and checks the verified Supabase identity's email-confirmation status before any provisioning or protected data access.
5. A dedicated first-time onboarding/provisioning flow may create an internal record for a confirmed identity if no `supabaseAuthId` mapping exists. Ordinary protected API requests must not auto-provision missing mappings.
6. The server ensures the internal `User.email` field is set only from the verified identity, using the same trusted identity source.

### B. Required constraints

- `User.supabaseAuthId` is the authoritative identity mapping and must be unique.
- Keep the existing internal `User.id` and all user-owned relations unchanged.
- Never auto-link a user to an existing internal account because the email strings match.
- Never create or update an internal user from an unverified request body or an untrusted client value.
- A missing mapping on an ordinary protected API request is rejected (for example, `403 ACCOUNT_NOT_PROVISIONED`); it must not trigger implicit account creation. The dedicated onboarding flow may create a mapping only after token verification and server-side email-confirmation checks.
- Never match or link an existing internal account by email alone. If the confirmed identity's email is already used by a different internal user, fail provisioning with a generic `409 ACCOUNT_MAPPING_CONFLICT`; do not disclose the other account or alter either mapping.
- Fail closed if a verified identity has no usable confirmed email, or if provisioning encounters a database error. Do not grant access on partial or failed provisioning.
- Handle duplicate provisioning attempts and concurrent requests safely using the unique `supabaseAuthId` constraint and conflict-safe logic.

### C. Concurrency and duplicate handling

Recommended approach:
- in the dedicated onboarding flow, use a transaction around lookup/create of the internal user
- attempt to find the user by `supabaseAuthId`
- if it does not exist and the identity is confirmed, create it with a unique guard on `supabaseAuthId`; if the email uniqueness constraint conflicts, return the generic conflict response and do not link by email
- if concurrent requests race, catch the `supabaseAuthId` unique-constraint error and re-read by that same verified ID; proceed only if the resulting mapping belongs to that ID, otherwise fail closed
- if a regular protected request finds no mapping, reject it and require the dedicated onboarding or account-resolution flow; do not recreate a deleted mapping automatically
- treat the operation as idempotent: same verified identity must resolve to the same internal `User.id`

This prevents duplicate internal user rows and avoids a “create-on-every-request” provisioning bug.

### D. Email confirmation impact

Supabase email confirmation governs whether the user is allowed to operate in the application.

Recommended behavior:
- sign-up is accepted and the user is created in Supabase Auth immediately
- email confirmation is required before the app unlocks protected features
- when a user is unconfirmed, the frontend redirects to a “check your email”/“confirm to continue” state
- Express must enforce confirmation on every protected API request using the confirmation status returned with the server-verified Supabase user (for example, a non-null `email_confirmed_at`/`confirmed_at` value). A missing or unconfirmed status is rejected with `403 EMAIL_NOT_CONFIRMED` before provisioning or accessing application data; never rely on a frontend check or request-supplied claim for this decision.
- once email is confirmed, the app resumes normal session management and protected route access

### E. Email change and duplicate-user scenarios

- `User.email` remains a business record, but it is not the identity anchor for access.
- If a Supabase user changes their email, the server should update the internal `User.email` only after validating the trusted identity and checking collisions.
- If the new email already belongs to another internal user, do not silently merge identities; fail the update with a generic conflict and require a manual account-resolution step.
- If the internal mapping is missing on a protected request, reject it rather than guessing or creating a fallback identity. A mapping may only be created through the dedicated first-time provisioning flow described above; do not recreate a deleted mapping automatically.

No schema changes or migrations are required for this phase. The current `supabaseAuthId` field already supports the required mapping pattern.

## 5. Session lifecycle

### Signup and email confirmation
- Sign-up happens via Supabase Auth.
- The app should surface an email-confirmation message and block access to protected pages until confirmation succeeds.
- The app should not assume an unconfirmed user is ready to access user-scoped data.

### Login
- Login uses email/password through Supabase.
- The browser client stores the session using the SDK’s supported session storage strategy.
- The app reloads its auth state from the stored session after page refresh.

### Restoring the session after page refresh
- Use the Supabase browser client’s hydration/session restore mechanism.
- Avoid manually writing auth tokens to `localStorage` or any custom storage outside the SDK.
- Restore app state only after the SDK confirms the user session is valid.

### Access-token refresh
- Supabase handles token refresh automatically according to the provider’s configured expiration behavior.
- The frontend should react to refresh errors by signing the user out and redirecting them to login while preserving a clear error message.
- The API should treat expired or otherwise invalid tokens as `401 Unauthorized` and not attempt to infer permission from stale state.

### Logout
- Use Supabase sign-out and clear all app-local auth state.
- Clear any in-memory auth state, query caches, and route guards that depend on auth.
- Do not leave a stale session token in any app-level cache or browser storage outside the SDK’s supported flow.

### Password reset and recovery
- Use Supabase password reset email flow for “forgot password”.
- Use the recovery callback with a safe redirect URL to a reset page.
- The app should handle invalid or expired reset links by showing a retry path and resetting the UI state without exposing sensitive details.

### Password update
- After user authentication, allow the user to change their password through the Supabase Auth API.
- Require reauthentication when the system policy demands it; do not create a separate custom password system.

### Redirect URLs and environments
- Use explicit redirect URLs for local development and production, e.g. local front-end callback pages and production app URLs.
- Keep redirect URLs in environment config and never embed auth metadata in query strings beyond the provider-generated callback parameters.
- Ensure app URLs are known and allowed by Supabase Auth settings.

## 6. Authorization and data ownership

### Required rules

- Every protected API endpoint must authenticate the caller before accessing any data.
- No request can determine ownership from `userId`, `ownerId`, `companyId`, or similar body/query fields.
- The server resolves the internal user ID only from the verified token identity.
- All reads, writes, updates, and deletes are scoped to that authenticated user.
- Creates assign `userId` server-side and never accept it from the client.
- Updates and deletes must verify both record existence and ownership before modifying data.
- Related records must also be checked against the same user.

### Scope rules for all domain models

The following rules apply across `Company`, `Contact`, `JobApplication`, `Task`, `Event`, and `Activity`:
- read queries must include `userId = req.auth.userId`
- updates/deletes must use a same-user and same-record constraint
- nested relations must be checked as part of the service logic
- search, filters, pagination, exports, calendar events, tasks, and activity streams must all be narrowed to the authenticated user

### Protected route responses

Use these responses consistently:
- `401 Unauthorized`: missing, malformed, invalid, expired, or unverifiable bearer token.
- `403 Forbidden`: the token is valid, but the identity is unconfirmed, has no provisioned internal mapping, or is not permitted to perform the requested action.
- `404 Not Found`: an owner-scoped lookup finds no record. Use the same response for a nonexistent record and a record owned by someone else; do not reveal whether another user's record exists.

Use `403` for identity or action-level denial, and `404` for record-level misses after applying the owner scope. Do not return `403` for a cross-owner record lookup, because that would disclose that the record exists.

### Input validation and mass-assignment defense

Every request should validate:
- params
- query strings
- body schema
- nested record references
- user-controlled foreign keys

The server must explicitly reject or ignore fields like:
- `userId`
- `supabaseAuthId`
- `ownerId`
- any auth-related metadata

Mass assignment must be prevented by using a strict DTO parser and explicit property mapping into the database layer.

## 7. Prisma, PostgreSQL, and RLS

### Current Prisma design
The schema already has appropriate same-user ownership patterns:
- `User` owns each domain table through `userId`
- composite unique constraints such as `@@unique([id, userId])` prevent cross-user associations
- relation fields include `onDelete: Cascade` for the user-owned records and `Restrict` for dependent record links

This is a strong app-layer foundation and aligns with the intended authorization model.

### Recommended using Prisma + app-layer auth
For the initial release, the safest and most maintainable design is:
- Prisma handles DB mapping and transactions
- Express handles authentication and authorization context
- the request layer derives `userId` from the verified identity and scopes every DB query to that user

This is a good fit for the current architecture and keeps the auth decision inside a single, testable security boundary.

### Row-level security (RLS)
RLS is optional for defense in depth but is not required for the initial release. The app layer should remain the primary authorization boundary because:
- the existing app is built around Prisma within a clean server-side service layer
- the current requirement is “authentication and strict ownership at the API layer”
- RLS can be added later, but it is not a substitute for per-request server-side auth checks

If RLS is introduced in the future, it should be treated as a second line of defense on top of the same user-scoped application logic and not as a replacement for validation or route authorization.

## 8. Implementation sequence and status

The implementation sequence is:

- Supabase browser and server clients, auth pages, and protected route guards are implemented; live auth still requires project URL/key and redirect configuration.
- Express verification, confirmed-email enforcement, trusted request context, and UUID-keyed provisioning are implemented and covered by unit tests.
- Owner-scoped CRUD routes and the frontend API provider are implemented. The new schema migrations must be explicitly approved and applied before these routes can be validated against the database.
- Route tests cover owner-scoped reads, create ownership, foreign related-record rejection, inaccessible-record 404s, and transactional unlink/delete behavior. More integration coverage and live Supabase validation remain.

Demo mode remains the default and preserves existing browser records while API-mode validation is pending.

## 9. Acceptance criteria for the approved design

The design is considered approved when all of the following are true:

- Supabase Auth remains the system of record for credentials, session lifecycle, email confirmation, reset, and refresh.
- Express verifies the bearer token before any authorization logic runs.
- Internal identity resolution is based only on the verified Supabase UUID and `User.supabaseAuthId`.
- Every domain record is scoped by `userId` from the authenticated request context.
- No client-supplied identity data is ever trusted for ownership decisions.
- No additional schema or migration changes are introduced during this design phase; the existing auth-ID migration has already been applied.

## 10. Implementation and migration boundaries

The authentication and authorization design is approved and implemented in the current repository. Continue to preserve its constraints: verified Supabase UUID mapping, server-side confirmation checks, least-privileged token verification, owner-scoped queries, strict DTO validation, and no email-only account linking.

Do not migrate demo data without an explicit data migration plan. The schema migrations do not import or alter demo records.
