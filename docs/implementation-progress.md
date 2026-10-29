# Implementation progress

## Baseline and Phase 0 — foundation

**Status:** Complete (2026-10-28).

- Confirmed the repository has a React/Vite frontend, Express API, Prisma 7 workspace, three existing frontend test files, and no existing GitHub Actions workflow.
- Read-only `npm run db:check` succeeded and reported the application tables. `npx prisma migrate status` reported both checked-in migrations applied and the schema up to date; no migration was run.
- `npm run prisma:validate` passed.
- `npm run test`, `npm run lint`, `npm run build`, and `npm run build:api` passed at baseline. The initial API build omitted the CA certificate.
- Updated the API build to copy the certificate and made Supabase database TLS fail closed if the certificate is missing. Verified the certificate is in `api/dist/` and reran `npm run db:check` successfully.
- Updated database setup and README connection-status statements based on the observed read-only checks.
- Secret-pattern scanning returned only the documented example files; local environment variable names were checked without reading or printing values.

## Phase 1 — existing bugs

**Status:** Complete for the inspected data/UI issues (2026-10-28).

- Replaced the first-required-field check with per-record Zod validation for company, application, contact, task, and event forms, including dates, URLs, emails, enums, ordering, and existing relationship IDs.
- Added field-level accessible errors, retained tag values while editing, and added Escape handling, focus trapping, initial focus, and focus restoration to the record dialog.
- Separated all-day date values from timestamped event values. Existing timestamp-formatted demo dates are normalized to local calendar dates when loaded; events remain instants. Invalid date values now fail instead of silently becoming today.
- Aligned activity frontend/demo/storage types with the Prisma model while defaulting missing legacy fields for localStorage compatibility.
- Extracted demo deletion behavior and fixed unlinking company/contact/application references, including activity references, before record removal. Database-backed deletion must use the same unlink-and-delete behavior in a single transaction.
- Added validation, calendar boundary, and deletion regression tests.
- Verification: `npm test` passed (16 tests), `npm run build` passed, and `npm run lint` passed. Vite emitted existing dependency annotation warnings only.

## Phase 2 — Supabase authentication foundation

**Status:** Implemented; live Supabase flows and database-backed records still need runtime verification.

- Added optional paired API configuration for the Supabase URL and publishable key, server-side token verification, confirmed-email enforcement, identity mapping by Supabase UUID, and a verified provisioning endpoint.
- Added frontend session restoration, signup/login/confirmation/recovery screens, and API-mode route gating. Demo mode remains the default.
- Fixed the missing account actions: demo mode was the default and the profile menu rendered Sign out only in API mode, so signed-out demo users saw only the static demo identity. The signed-out profile menu now links to Sign in and Create account in either mode. A restored Supabase session displays that account in demo mode, and Sign out clears the session and navigates to the login screen.
- Auth unit tests cover verification and safe provisioning behavior. Live signup, email delivery, and confirmation have not been tested end-to-end.
- `requireAuth` is applied to `/api/data`; `/api/auth/provision` independently verifies the bearer token and confirmed identity before provisioning.
- Added mocked UI/provider tests for signed-out menu options, signup confirmation messaging, successful login, session restoration after provider remount, and sign-out. Added middleware tests for missing-token rejection and distinct UUID-to-internal-user mappings.
- Fixed the local server configuration mismatch: frontend `.env.local` uses `VITE_SUPABASE_*`, while Express requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `api/.env`. The API env file now has the backend names populated from the matching local frontend project settings, without changing credentials in tracked files. A separate compiled API process loaded that config and returned 401 for a missing bearer token instead of `AUTH_NOT_CONFIGURED` 503.
- Added middleware regressions for missing server configuration (503), valid token verification (`getUser(token)`), invalid token rejection (401), and UUID-scoped internal identity resolution.
- The test command now scopes discovery to frontend/API source and the API build excludes test files, preventing generated `dist` tests from being rediscovered after a build.

## Phase 3 — database-backed records

**Historical status (2026-10-28):** Authenticated CRUD and the API-backed frontend provider were implemented; migrations were pending at that point.

- Added nullable `JobApplication.prepNotes`, `Task.category`, and `Contact.tags` to the Prisma schema. Their reviewed SQL migrations are non-destructive and remain **unapplied**.
- Wired interview preparation notes into the application form, validation, demo data, and legacy localStorage defaults.
- Added authenticated `GET /api/data` and owner-scoped create, update, and delete operations for companies, applications, contacts, tasks, and events. Internal user IDs are derived from verified auth; related-record ownership is checked; deleting referenced records unlinks optional relationships in the same transaction. Activities are included in reads and unlinking.
- Added an API-backed frontend provider selected only by `VITE_DATA_MODE=api`; browser-local demo remains the default. API read/write errors are surfaced in the workspace UI, and settings distinguish local demo data from authenticated workspace data.
- Added a provider regression test proving API failures are surfaced and never fall back to demo records.
- Health reports `authenticated-api`; README and database setup now describe the auth/API mode and migration state.
- `npm run build:api`, `npm run build`, `npm test` (42 tests), and `npm run lint` passed after the configuration fix. A compiled API smoke test on a temporary port returned health 200 and unauthenticated data 401.
- Read-only `prisma migrate status` reports four migrations total: the original two are applied; `20261028000000_add_preparation_notes_and_task_category` and `20261028010000_add_contact_tags` are pending. No migration was run.
- Read-only Prisma field probes confirmed that the connected database lacks `JobApplication.prepNotes`, `Task.category`, and `Contact.tags`; these missing columns explain the dashboard's authenticated data-read failure. The API now maps Prisma `P2022` to a safe `DATABASE_SCHEMA_OUTDATED` 503, and the dashboard replaces loading/error content rather than presenting a failed request as an empty workspace.
- Added API regression coverage for owner-scoped create/update/delete across all five record types, schema-mismatch error handling, provider retry after failure, and the dashboard's error state. This mocked coverage does not substitute for live user-data CRUD or cross-user integration verification.

## Historical remaining work at 2026-10-28 (superseded by the audit update below)

1. After explicit approval of the target database and pending migrations, verify authenticated CRUD, persistence, and cross-user isolation against that database.
2. Add readiness semantics, CI, and preservation tests for data export/import.
3. Complete product improvements and applicable production hardening.

**Current blockers:** Live signup/email confirmation/password recovery still require Supabase URL/key configuration and dashboard redirect settings. Database-backed CRUD is not runtime-verified because its schema changes are pending. Do not apply those migrations until the target database is explicitly approved. Demo data is not automatically imported into the authenticated database workspace.

**Next action:** Add focused tests for API request/response behavior and owner scoping; complete runtime validation after the database and Supabase configuration decisions are made.

## 2026-10-29 audit and regression fixes

**Status:** Safe code fixes implemented; approved schema migrations applied and verified; live authenticated CRUD remains unverified.

- The worktree already contained extensive uncommitted changes when this audit began. The first verification was run against that current state (14 test files, 48 tests); tests, lint, frontend build, API build, and Prisma validation all passed. No pre-change pristine baseline was available.
- Rechecked the connected database read-only: the connection succeeds and contains the seven CareerOS tables. Before approval, four migrations were present with the initial and Supabase-auth migrations applied and both feature migrations pending.
- `prisma migrate diff` initially found exactly the three expected missing columns and no other schema differences. `Contact.tags` is a PostgreSQL text array with an empty-array default; preparation notes and category are nullable text. There are no foreign keys or indexes on these added columns. Corrected the pending contact-tags migration to match Prisma-generated SQL and the existing Company tags convention (not `NOT NULL`).
- Compared configured frontend/backend Supabase references with the database connection identity without printing them; the configured references matched. The user explicitly confirmed the configured target and approved the exact additive migration plan.
- Fixed an optional task due date causing `TasksPage` to throw while formatting an empty date; added regression coverage.
- Fixed malformed JSON and oversized API bodies returning generic 500 responses; they now return safe 400/413 errors. Known transient Prisma connection failures now return a redacted 503. Added focused API regression tests.
- Generic API errors now log only an error type and optional code, not exception messages, stack traces, SQL, or query metadata.
- API write errors now distinguish retrying a rejected 4xx mutation from refreshing after uncertain server/network failures; a retry action no longer silently performs only a data reload for a rejected write. Regression coverage verifies the request is reissued.
- Live Auth signup, confirmation, password recovery, authenticated CRUD, persistence, and cross-user isolation were not exercised. No production records were read or changed.
- Final verification after these fixes: `npm test` passed (15 files, 54 tests); `npm run lint`, `npm run build`, `npm run build:api`, and `npm run prisma:validate` passed. The frontend build retains existing Zod dependency annotation warnings.
- A compiled API smoke test against the configured database returned health HTTP 200 with database status `connected`; an unauthenticated `/api/data` request returned 401. This was read-only and did not verify authenticated record persistence.
- After approval, `npm run prisma:migrate:deploy` applied both feature migrations. Read-only `prisma migrate status` reports all four applied, `prisma migrate diff` reports no differences, and column inspection confirms nullable prep/category text plus contact tags with an empty-array default. No user records were created, modified, or deleted.

**Remaining blockers:** Live signup, email confirmation, password recovery, authenticated CRUD, persistence, and cross-user isolation still require authorized Supabase test accounts and end-to-end checks. Demo mode remains available and does not import records.

**Applied migration plan:** `npm run prisma:migrate:deploy` ran once against the user-confirmed configured target. It added nullable `JobApplication.prepNotes TEXT`, nullable `Task.category TEXT`, and `Contact.tags TEXT[] DEFAULT ARRAY[]::TEXT[]`. The latter initializes existing rows to empty arrays. These migrations add no indexes or foreign keys and did not delete or rewrite records.

**Next action:** Verify live Auth and CRUD flows with authorized test accounts, then check persistence and isolation without touching production records.
