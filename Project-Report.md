# CareerOS — Second-Pass Audit (Snapshot 2026-10-28)

> **Superseded:** This snapshot predates the current authenticated API and CRUD implementation and contains outdated conclusions. See [docs/implementation-progress.md](docs/implementation-progress.md) and [DATABASE_SETUP.md](DATABASE_SETUP.md) for the current verification state. As of 2026-10-29, automated tests/builds pass, all four migrations are applied after explicit owner approval, and Prisma reports no schema difference.

**Scope of inspection:** I read the *entire* `project-context.txt` (2026‑10‑28, 47 files, 475,259 bytes) including `docs/authentication-authorization-design.md`, the new migration `20261025000000_add_supabase_auth_id`, the updated `prisma/schema.prisma`, and every frontend file. I did **not** execute builds, tests, SQL, or network calls. Every finding below is derived from the snapshot; where runtime verification is needed I say so explicitly.

**What changed since the 2026‑10‑25 snapshot (the one I audited in the prior turn):**

| Change | Evidence | Effect |
|---|---|---|
| Added `docs/authentication-authorization-design.md` (21.8 KB) | `docs/` folder in tree | A design contract exists; **not implementation**. |
| Added migration `20261025000000_add_supabase_auth_id` (162 bytes) | `prisma/migrations/` tree + file contents | Adds `User.supabaseAuthId UUID UNIQUE`. Doc claims **it was applied**. |
| `prisma/schema.prisma` now has `supabaseAuthId String? @unique @db.Uuid` | schema diff (7485 → 7541 bytes) | Schema matches migration. |
| `.gitignore` now excludes `/project-context/` | `.gitignore` diff (371 → 422 bytes) | Good hygiene — the generated snapshot is not committed. |
| Nothing else changed | All frontend files, `api/src/**`, README byte-identical to prior snapshot | The app is still 100 % demo-local. |

**Bottom line up front:** The most important claim in this snapshot — *"the `supabaseAuthId` migration has been applied successfully"* — cannot be verified from the snapshot. Nothing else in the codebase lets me confirm it. **You still have exactly one blocker before any auth or CRUD work: prove the database is connected and the two migrations are applied.** The new design doc is excellent; the code is not yet started. Read Sections 4, 8, and 12 first.

---

## 1. Executive Summary

CareerOS is a polished, single-user, browser-local React career-management app with a Prisma/Express backend that is **still not connected to the frontend, still not authenticated, and still not proven reachable from this machine.** The prior audit's conclusion stands, but this snapshot adds three real advancements:

1. **A proper, thorough auth design document.** It is unusually high quality for a student project: it explicitly names JWT-verification strategy (`supabase.auth.getUser(token)`), the failure model (401/403/404), the internal-user mapping rule (`supabaseAuthId`), the anti-mass-assignment rules, the "never trust client `userId`" rule, and the "no implicit provisioning" rule. **This is a genuine asset.**
2. **A schema migration that adds the identity anchor.** `User.supabaseAuthId UUID @unique` is the correct primary mapping key. The migration file is simple and safe (nullable column + unique index) — nothing destructive.
3. **`.gitignore` now excludes `project-context/`.** Small, correct.

What has **not** changed: the frontend still uses `DemoCareerDataProvider` and `localStorage`; the API still exposes only `/api/health`; `prisma/schema.prisma` and `api/src/db/client.ts` are unchanged; there is still no auth middleware, no CRUD route, no Supabase client, and no verification that the DB connection resolves today. The README *still* says the Supabase host cannot resolve, and the design doc hedges ("this environment cannot currently resolve/connect"). **This is still a demo app with a very good design document on top of it.**

The single most valuable next action is unchanged: **prove the DB connection resolves and both migrations are applied** — otherwise the design doc's central assumption (`supabaseAuthId` migration applied) is unverified and any auth work built on it is built on sand.

---

## 2. What the Project Currently Does

### Product
CareerOS is a personal career-management workspace. A single user manages:

- **Companies** — name, industry, website, LinkedIn, careers page, size, tags, location, notes.
- **Applications** — job title, company, status (Saved → Applied → Assessment → Interview → Offer → Rejected), applied date, next action, next follow-up, job type, work arrangement, resume reference, job posting URL, notes.
- **Contacts** — name, role, company, connection status (Not connected / Requested / Connected), LinkedIn, email, phone, connection-requested/accepted dates, last-contacted, next follow-up, tags, notes.
- **Tasks** — title, company, due date, priority (Low/Medium/High), description, contact link, application link, category, done flag.
- **Events** — title, type (Interview/Assessment/Networking/Other), company, start/end, location, meeting URL, contact link, application link, notes.
- **Activities** — description, company link, timestamp (read-only in UI).

The **Overview** dashboard surfaces metrics, a compact monthly calendar, upcoming follow-ups, and recent applications. **Directories** provide search, sort, and filters per record type. **Tasks** has a two-column To‑do/Completed board. **Calendar** is a full-width month grid with day detail. **Settings** exports JSON.

### Today's data path
Everything is **browser-local**. `DemoCareerDataProvider` (`src/context/CareerData.tsx`) holds `CareerData` in React state, hydrates from `localStorage` under `careeros-demo-v1`, and on every change writes the whole object back. No request hits `http://localhost:3001` except nothing — the `vite.config.ts` proxy exists but is unused.

### Backend today
Only `/api/health`, which returns `{ status, service, mode: 'foundation-only', database: <status> }`. `database` is populated by `setDatabaseStatus()` in `api/src/server.ts` after a single `SELECT 1` at startup. No CRUD routes; no auth; no repository/service layer.

### Data that actually exists right now
`src/data/demo.ts` — 7 companies, 11 applications, 9 contacts, 7 tasks, 4 events, 4 activities. Persisted only in a browser's `localStorage` for a given browser profile and origin.

---

## 3. Architecture and Data Flow

### Intended architecture (per design doc + README)

```
Browser (React 19 + Vite 7)                    Express 5 API (:3001)              Supabase
─────────────────────────────                  ─────────────────────────────      ──────────
Supabase browser SDK                           requireAuth middleware              auth.users
  • sign in / sign up                          → supabase.auth.getUser(token)  ←──  JWT issued
  • session lifecycle                          → resolve User.supabaseAuthId  ←───  Postgres
  • attach Authorization: Bearer               → req.auth.userId                   (Prisma)
  • route guards on protected pages            → /api/companies, /applications,
  • pages use TanStack Query                      /contacts, /tasks, /events
  • UI state (theme) stays local                                                  Prisma 7 + pg.Pool
                                                                                  with Supabase CA

Today's reality:
  Browser ── DemoCareerDataProvider ── localStorage   (100% of UI data)
  Express ── /api/health only
  Supabase ── configured in api/.env (excluded); connection unverified
  Migrations ── 2 files exist; applied status unverified
```

### Important files and their responsibilities

| File | Responsibility | Status |
|---|---|---|
| `src/App.tsx` | Providers (`QueryClientProvider`, `ThemeProvider`, `DemoCareerDataProvider`), routes, lazy loading | Unchanged from prior snapshot |
| `src/components/AppShell.tsx` | Sidebar, topbar, global ⌘K search, quick-add menu, record dialog trigger, theme toggle | Unchanged |
| `src/context/CareerData.tsx` | The actual data layer: local CRUD + Zod-validated `localStorage` persistence | Unchanged |
| `src/data/demo.ts` | Seed data + `getCompanyName` fallback + `recordCollections` | Unchanged |
| `src/components/RecordDialog.tsx` | Per-type form with only single-required-field Zod validation | Unchanged |
| `src/components/MonthlyCalendar.tsx` | Month grid, indicators, add/open/delete event | Unchanged |
| `src/lib/calendar.ts` | `getCalendarDays`, `getScheduledItems`, `getItemsForDate` | Unchanged |
| `src/lib/followUps.ts` | Merge + dedupe of task/app/contact follow-ups | Unchanged |
| `src/pages/Dashboard.tsx` | Metrics, compact calendar, next steps, recent apps | Unchanged |
| `src/pages/DirectoryPages.tsx` | `DirectoryPage`, `TasksPage`, `CalendarPage`, `SettingsPage` in one file | Unchanged |
| `src/types.ts` | Frontend domain types | **Unchanged** — no auth types, no API DTO types |
| `api/src/app.ts` | Express, CORS, pino, `/api/health`, error handler | Unchanged |
| `api/src/config.ts` | Zod env validation for `PORT/WEB_ORIGIN/NODE_ENV/DATABASE_URL` | Unchanged |
| `api/src/db/client.ts` | Prisma singleton + `pg.Pool` with Supabase CA loading | Unchanged |
| `api/src/db/status.ts` | In-memory DB status enum | Unchanged |
| `api/src/server.ts` | Startup `SELECT 1`, graceful shutdown | Unchanged |
| `api/src/db/check-connection.ts` | `db:check` script | Unchanged |
| `prisma/schema.prisma` | Models + enums; **now includes `User.supabaseAuthId`** | Changed (this snapshot) |
| `prisma/migrations/20261023000000_initial/` | Base tables | Unchanged |
| `prisma/migrations/20261025000000_add_supabase_auth_id/` | **New** — adds nullable UUID column + unique index | Confirmed present; applied status **unverified** |
| `docs/authentication-authorization-design.md` | The auth design contract | **New** — design-only |
| `.gitignore` | Now excludes `/project-context/` | Changed (good) |

### Intended data flow once auth+CRUD lands (per design doc §3C and §8)

1. User signs up via Supabase Auth (`signInWithPassword` / `signUp`).
2. Frontend stores the session via the SDK's supported strategy (not raw `localStorage`).
3. Every protected fetch sends `Authorization: Bearer <access_token>`.
4. Express middleware calls `supabase.auth.getUser(token)` (server-side; least-privilege key; no service-role key needed).
5. Express checks `email_confirmed_at` on the verified identity.
6. Express resolves `req.auth.userId` from `User.supabaseAuthId = verified_uuid`.
7. Service layer scopes every Prisma query to `req.auth.userId`.
8. Postgres enforces the same-user composite FKs as a second line of defense.

**None of steps 1–8 are implemented in the snapshot.** The design doc is a plan, not code.

---

## 4. Implemented, Partial, Missing, and Unverified Functionality

| Capability | Status | Evidence | Notes |
|---|---|---|---|
| Overview dashboard metrics | **Implemented** | `src/pages/Dashboard.tsx` | Computed from demo data only |
| Dashboard compact calendar + next steps | **Implemented** | `Dashboard.tsx` + `MonthlyCalendar.tsx` + `getUpcomingFollowUps` | Local only |
| Application tracking CRUD | **Implemented (local)** | `CareerData.tsx`; `RecordDialog.tsx`; `DirectoryPage` | Not in DB |
| Company directory CRUD | **Implemented (local)** | `DirectoryPage` route `'/companies'` | Not in DB |
| Contact directory CRUD | **Implemented (local)** | `DirectoryPage` route `'/contacts'` | Not in DB |
| Search (⌘K global + per-directory `?q=`) | **Implemented** | `AppShell.tsx`, `DirectoryPage` | Search is name/company/jobTitle only |
| Sorting | **Implemented** | `DirectoryPage` `sortField/sortAscending` | In-memory; not in URL |
| Filtering | **Implemented** | `DirectoryPage` state filters | Not in URL; refresh resets |
| Tasks To‑do / Completed board | **Implemented (local)** | `TasksPage` | Filters work; boundaries need TZ tests |
| Calendar month grid, indicators, day detail | **Implemented** | `MonthlyCalendar.tsx`, `calendar.ts` | TZ edge risk; see F2 |
| Calendar create/delete events from calendar | **Implemented (local)** | `onAdd`, `onDeleteEvent` | Task delete not offered from calendar (only from Tasks page) |
| Light/dark theme persistence | **Implemented** | `ThemeProvider.tsx`, `index.html` inline bootstrap | Flash-free |
| Settings JSON export | **Implemented** | `SettingsPage` | Download only |
| Zod validation on forms | **Partial** | `RecordDialog.tsx` validates only the first `required` field | Non-required fields not validated; see F3 |
| `DemoCareerDataProvider` `localStorage` persistence | **Implemented** | `CareerData.tsx` | Read is defensive (Zod-validated); invalid data → demo seed |
| Express health endpoint | **Implemented** | `api/src/app.ts` | Returns in-memory status |
| Prisma schema | **Implemented** | `prisma/schema.prisma` | `supabaseAuthId` added |
| Initial migration | **Implemented (file)** | `prisma/migrations/20261023000000_initial/migration.sql` | Applied status unverified |
| `supabaseAuthId` migration | **Implemented (file)** | `prisma/migrations/20261025000000_add_supabase_auth_id/migration.sql` | **Doc claims applied — unverified** |
| `db:check` script | **Implemented** | `api/src/db/check-connection.ts` | — |
| Supabase Auth (sign-up, sign-in, session) | **Missing** | No `@supabase/*` in `package.json`; no auth UI; no middleware | Design exists |
| Express auth middleware (`requireAuth`) | **Missing** | `api/src/app.ts` has no auth | Design exists |
| Internal user provisioning (`supabaseAuthId` mapping flow) | **Missing** | — | Design exists |
| CRUD API routes (`/api/companies`, `/api/applications`, …) | **Missing** | `api/src/app.ts` has only `/api/health` | — |
| Frontend → API data provider | **Missing** | No `fetch` to `/api` anywhere | — |
| Row-level security | **Not planned initially** | Design doc §7 says app-layer is primary | Acceptable first step |
| Database verified connected | **Unverified** | README still says "cannot resolve" | **Run `db:check`** |

### A design-doc credibility note
The doc is written as a contract. It's careful about the things that usually go wrong: fail-closed 401/403, no auto-provisioning, no email-match linking, no client-supplied `userId`, generic 404 for cross-tenant. Two things I want to explicitly verify before implementation:

1. **`supabase.auth.getUser(token)` per-request latency.** Calling Supabase Auth on every request adds ~30–80 ms of network latency. The design should specify either a short in-process cache keyed by token hash (with exp) or the local JWT verification path (`createClient(...).auth.getUser(jwt)` vs verifying the JWT signature locally with the project's JWKS). The current plan is correct but may become a performance issue at scale. **Not a bug — a design decision to lock down now.** Note: locally verifying the JWT (signature against Supabase's JWKS) is generally faster and is what Supabase themselves recommend for high-throughput server-to-server. Worth deciding explicitly.
2. **The `supabaseAuthId` migration is asserted as applied with no independent evidence in the snapshot.** Before writing auth code that assumes the column exists, verify it exists.

---

## 5. Confirmed Bugs

> **Definition:** A bug is *confirmed* when the code in the snapshot unambiguously produces incorrect behavior. Runtime-dependent behavior is not "confirmed."

**No new P0/P1 confirmed bugs since the prior audit.** The following P2/P3 items are confirmed by code:

### F1 (P3) — `RecordDialog` only validates the first `required` field
- **Evidence:** `src/components/RecordDialog.tsx`, `save()` — `z.object({ [required?.name ?? '']: z.string().trim().min(1, …) })`. Only the first `required` field is in the schema.
- **Impact:** Invalid `date`, `email`, `url` fields are accepted without client-side rejection. `dateValue()` in `CareerData.tsx` silently falls back to `now` for unparseable dates — the record is persisted with an unintended value.
- **Verification:** In the app, add an Application with `Job title = "x"` and `Application date = "not a date"` (paste text). Submit. The record is created; open it in Edit — the date shows today's date.
- **Fix:** Per-type Zod schemas (reuse `applicationSchema` shape from `CareerData.tsx` but with per-field messages) applied on submit, ideally shared with the future API.

### F2 (P2) — Calendar time-zone boundary risk (unchanged from prior audit)
- **Evidence:** `src/lib/calendar.ts` uses `parseISO(event.startsAt)` and `date-fns` `isSameDay` against a user-local `selectedDate`.
- **Impact:** For users far from UTC (e.g., UTC+10), an event stored at `2024-02-29T22:30:00.000Z` renders on March 1 in the browser but is stored as Feb 29 UTC. The user sees it on the wrong cell.
- **Verification (proposed test, not run):** Add a Vitest case with `TZ=Asia/Tokyo` and an event at 23:30 local; check `getScheduledItems` and `getItemsForDate`.
- **Fix:** Store task due dates as `YYYY-MM-DD` (no TZ) and events as ISO with TZ. Compare both sides via `yyyy-MM-dd` in a fixed TZ (`date-fns-tz`) or store the user's TZ with each record.

### F3 (P3) — Filters not in URL; refresh clears them
- **Evidence:** `src/pages/DirectoryPages.tsx` `DirectoryPage` — `statusFilter`, `companyFilter`, `industryFilter`, `tagFilter`, `sortField`, `sortAscending` are all `useState`. Only `q` is in `useSearchParams`.
- **Impact:** Refresh loses filters; "Copy link to this view" not possible.
- **Fix:** Move to `useSearchParams`. Low risk.

### F4 (P3) — `getScheduledItems` calls `parseISO` on every task every render; recomputed on every change
- **Evidence:** `src/lib/calendar.ts` `getScheduledItems`. `MonthlyCalendar.tsx` memoizes with `[data]`, so a parent re-render that changes `data` re-runs it (expected). This is fine for the demo size. **Flagging as a perf watch item, not a bug.**
- **Fix later:** Cache `CalendarItem.date` in the derived data layer once data lives on the server (needed to preserve `Date` identity for `isSameDay`).

### F5 (P3) — Non-destructive task deletion from the calendar page is not exposed
- **Evidence:** `MonthlyCalendar.tsx` renders a delete button only when `item.type === 'event'`. `CalendarPage` (`DirectoryPages.tsx`) uses `onDeleteEvent` only.
- **Impact:** Users can add tasks from the calendar but must navigate to `/tasks` to delete them. Likely a product decision, but worth confirming.
- **Verification:** Add a task via calendar → try to find a delete affordance → none exists on calendar.

### F6 (P3) — `RecordDialog` closes without focus restoration
- **Evidence:** `src/components/RecordDialog.tsx`. No focus trap, no focus restoration on close.
- **Impact:** Accessibility gap; keyboard users lose context. Fix before public deploy (`focus-trap-react` or a small custom hook).

### F7 (P3) — `prod-ca-2021.crt` is not copied into `api/dist/`
- **Evidence:** `api/tsconfig.json` includes only `src/**/*.ts`; `api/package.json` `"build": "tsc -p tsconfig.json"`. The `db:check` script reads `../../prod-ca-2021.crt` relative to `api/src/db/client.ts` → resolves to `api/prod-ca-2021.crt` **in dev**. In production (`api/dist/db/client.js`), it resolves to `api/dist/prod-ca-2021.crt` — **absent**, so `fs.existsSync` is false and the code silently falls into the non-Supabase branch (plain `pg.Pool` with the connection string, no explicit CA). Behavior is functionally different from dev.
- **Impact:** Production `db:check` may fail TLS verification, or (depending on the `pg` version and the connection string's `sslmode`) may connect without `rejectUnauthorized: true`. **Do not assume it's secure.** This is a "silent fallback" risk.
- **Verification:** `npm run build:api`, then `Test-Path api\dist\prod-ca-2021.crt` → `False`.
- **Fix:** Add `"build": "tsc -p tsconfig.json && node -e \"require('fs').copyFileSync('prod-ca-2021.crt','dist/prod-ca-2021.crt')\""` to `api/package.json`, or move the cert loading into a module that can be bundled.

### F8 (P3) — `AppShell` "LogOut" button does not log out
- **Evidence:** `src/components/AppShell.tsx` — the user menu has `<button onClick={() => setMenuOpen(false)}><LogOut size={15} /> Close menu</button>`. The label says "Close menu" but the icon is a logout icon; the action only closes the menu.
- **Impact:** Misleading affordance — no actual session to terminate yet (no auth). Fix when auth lands.
- **Fix:** Rename to "Sign out" and wire to Supabase `signOut()`.

### F9 (P3) — `data/status.ts` reflects only the startup check, not live DB state
- **Evidence:** `api/src/db/status.ts` sets `databaseStatus` once at startup via `server.ts`. `GET /api/health` reports this cached value.
- **Impact:** If DB goes down after startup, `health` still says `connected`. Fine for a foundation; will be a monitoring gap later.
- **Fix:** Add a lightweight `SELECT 1` cache with a short TTL when deploying.

### F10 (P3) — `activitySchema` in `CareerData.tsx` omits a `type` field, but `Activity` type declares one
- **Evidence:** `src/types.ts` `Activity` has `{ id, description, occurredAt, companyId }` — no `type`. `prisma/schema.prisma` `Activity` has `type: String`. `src/context/CareerData.tsx` `activitySchema` matches the frontend type (no `type`).
- **Impact:** None today (activities aren't writable from the UI), but the frontend and DB disagree on the shape. When activities get wired to the API, a mismatch will surface.
- **Fix:** Align the frontend `Activity` type with the Prisma model now, or remove `type` from Prisma until the UI needs it.

---

## 6. Likely Bugs and Issues Requiring Verification

These are strong inferences, not confirmed defects.

### L1 (P2) — Design doc's "migration has been applied" claim needs independent confirmation
- **Evidence:** `docs/authentication-authorization-design.md` §Status and §10 assert the `20261025000000_add_supabase_auth_id` migration **has been applied**. The snapshot cannot verify this. README still says the host is unreachable.
- **Impact:** If the migration was applied but the base migration (`20261023000000_initial`) was not, the DB is in an inconsistent state and `User.supabaseAuthId` may not exist. If the DB user lacks `ALTER TABLE` privileges, an apply attempt could fail mid-transaction. **No destructive step should be run before `prisma migrate status` says what is applied.**
- **Verification (safe, read-only):**
  ```powershell
  cd api
  npx prisma migrate status
  npm run db:check
  ```
  Expected: both migrations `applied` OR at minimum `20261023000000_initial` applied and the second one `pending`/`failed`. If `db:check` prints "PostgreSQL connection succeeded" then the schema verification is one step away:
  ```powershell
  npx prisma studio   # browser; check User table has supabaseAuthId column
  ```
- **Fix:** Only after the status output is understood. If pending: `npm run prisma:migrate:deploy`. **Take a fresh DB backup first.**

### L2 (P2) — Auth design's `getUser(token)` per-request latency (design, not bug)
- **Impact:** At current scale, irrelevant. When the app gets real usage, calls to Supabase Auth add 30–80 ms of p50 and expose you to Supabase Auth's outage window.
- **Verification:** Instrument once auth is built. In dev, `console.time` around the call.
- **Fix:** Verify the JWT locally against the project's JWKS (Supabase exposes `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`; validate signature + `exp` + `aud` + `iss`), falling back to `getUser(token)` only for revocation checks. Keep the fail-closed semantics the doc already prescribes. **Do not implement before the DB is verified.**

### L3 (P2) — No CORS tightening yet; `WEB_ORIGIN` is a single value
- **Evidence:** `api/src/app.ts` CORS uses `origin: config.WEB_ORIGIN`. Good default. But the CORS `methods` allow `PUT/PATCH/DELETE` — correct — and `credentials: false` — also correct for bearer-token auth (no cookies). When auth lands, keep `credentials: false` and rely on `Authorization` header. If you ever move to cookie sessions, you must flip to `credentials: true` and pin `WEB_ORIGIN` to a single production origin.
- **Impact:** None now. Design decision to lock in.

### L4 (P2) — No rate limiting on `/api/health` or any future auth callback
- **Impact:** DDoS surface once deployed. Not a bug today.
- **Fix:** `express-rate-limit` before public deploy.

### L5 (P2) — `express.json({ limit: '1mb' })` applies to all routes; if you ever accept file uploads this is a hazard
- **Impact:** Not a bug today. When resume/document upload lands, introduce a separate JSON-only route group and a separate multipart route group with size limits.

### L6 (P3) — Activity type/schema mismatch (see F10)
- **Verification:** Read the two files side-by-side — confirmed by inspection. Runtime impact depends on whether activity writes are ever enabled.

### L7 (P3) — No tests for the new auth design and no tests for the `supabaseAuthId` mapping
- **Evidence:** `src/**/*.test.ts` totals 3 files (demo, calendar, followUps). No API tests. No auth tests. `vite.config.ts` still has no `test` block (existing tests are pure Node, so they pass — but adding a React component test would fail silently without `environment: 'jsdom'`).
- **Fix:** See §14.

### L8 (P3) — `api/src/db/client.ts` silently falls back to non-Supabase branch if `isSupabase` is false or CA absent
- **Evidence:** `if (ca && isSupabase) { … strict SSL … } else { … connectionString only … }`.
- **Impact:** A typo in the Supabase hostname (say, `foobar.supabase.co.evil.example`) will *not* take the strict-SSL branch and will connect with default `pg` SSL semantics. For a student project this is low probability, but worth a defensive log line: `if (!isSupabase) console.warn('DATABASE_URL host is not Supabase; TLS CA not enforced.')`.
- **Fix:** Log a warning, or make the CA mandatory when `ssl=require` is in the URL.

---

## 7. Security and Privacy Findings

**Confirmed today (not exploitable because there is no data behind it):**

1. **No authentication anywhere.** `api/src/app.ts` and `src/App.tsx` have no auth guard, no session, no login. All data is local; nothing is exposed. **Impact the moment you deploy any CRUD endpoint: unauthorized access to every user's records.** The design doc correctly identifies this and mandates `requireAuth` first. Good.
2. **`localStorage` for demo data.** PII (contact emails, phone numbers, LinkedIn URLs) sits in the browser's `localStorage`. On a shared machine another OS user cannot read it, but **XSS on the same origin can exfiltrate it**. Add CSP before deploying the app publicly. **Not a bug today; a real risk tomorrow.**
3. **`.gitignore` correctly ignores `api/.env` and `.env.*`; the `!` exceptions allow `.env.example`.** Confirmed correct.
4. **`DATABASE_SETUP.md` and `api/.env.example` are excluded by the snapshot's secret scanner.** They contain at least one placeholder-shaped Postgres URL (matched the `postgres://user:pass@host` heuristic). **Verify locally that these are placeholders, not real credentials.** The prior audit flagged this; unchanged. If real → rotate Supabase DB password.
5. **`prod-ca-2021.crt` is a certificate, not a secret.** Fine to commit. But see F7 — it isn't copied into `dist/`, so production TLS behavior differs from dev.

**Design-decision risks in the new auth design (call these out now, not later):**

6. **Mass-assignment defense is planned (good) but the plan must include all six model classes**, not only the obvious ones. The doc names `userId`, `supabaseAuthId`, `ownerId`, and auth metadata. Add `createdAt`, `updatedAt`, `id` from the blocklist too — clients should not set them.
7. **Email-change handling is described but underspecified.** §4E says "update the internal `User.email` only after validating the trusted identity and checking collisions." Good. But **the ordering matters**: the internal email update must be in a transaction that also verifies `supabaseAuthId` hasn't been reassigned. Add this to the implementation checklist.
8. **First-time provisioning must be a distinct, guarded flow.** The doc says so. Make sure the route is `POST /api/auth/provision` (or similar) with a very restrictive rate limit and requires `email_confirmed_at`. Do not allow it from `requireAuth` middleware on any ordinary route. Otherwise an authenticated user with a valid token but no internal mapping can call *any* protected endpoint and trigger a row creation. The design is right; the implementation must not deviate.
9. **JWT verification failure must be *fail-closed*, including 503 for Supabase Auth outages.** The doc says so. Also log it — in production, you want an alert when the auth provider is unreachable.
10. **`User.email` is `@unique` globally.** This is correct for one user per email across the system. Combined with the "no email-match linking" rule, it produces the right behavior: if a Supabase identity's email already exists on a *different* internal user, provisioning must fail with a generic 409. The design doc handles this correctly. Do not "fix" this by removing the unique constraint.

**Supabase-specific:**

11. **Service-role key must never reach the frontend.** The design doc explicitly forbids it. Enforce this by never creating a Supabase client in `src/` with the service-role key; only the anon/publishable key. Verify `package-lock.json` doesn't accidentally pull `@supabase/supabase-js` into a frontend bundle that could be rebuilt with a service key — the current `package.json` has no `@supabase/*` at all, so you're clean today.
12. **RLS posture.** Prisma connects with the `DATABASE_URL` user. If that is `postgres` (which it likely is on a Supabase free project), RLS **does not apply** and any direct DB access by any authenticated API call can read any row *if the API code is wrong*. The app-layer scoping is your only defense today. When you deploy, create an application role (e.g. `careeros_app`) with `NOSUPERUSER` and enable RLS with policies keyed on `auth.uid()`. This is Milestone F (Deployment Hardening), not M1.
13. **`auth.users` (Supabase) and `public.User` (Prisma) are two separate tables.** That's the intended design — `supabaseAuthId` is the bridge. Do not duplicate emails as the identity anchor. The design doc handles this. Be disciplined: nothing in the app logic should ever `findFirst({ where: { email } })` for auth decisions.

**Privacy:**

14. **Contact PII in the DB is unencrypted.** Acceptable for a personal app; required for any shared deployment is encryption at rest (Supabase handles this) plus application-level field access control (only the owning user can read). The composite FK + `userId` scoping handles the access part.
15. **No data export limitation / account deletion flow.** When users can create records in a real DB, GDPR-style "right to be forgotten" becomes real. The cascade deletes on `User` handle the data integrity; the UI needs a "delete my account" flow. Roadmap F.

---

## 8. Database and Data-Integrity Findings

### Strengths (unchanged)
- Multi-tenant from day one (`userId` on every owned model).
- **Composite FKs enforce same-user ownership at the DB level** — `[companyId, userId] → [id, userId]`. This is unusually well done for a student project.
- `Cascade` only on `User`; `Restrict` on dependent references. Correct.
- Consistent `Timestamptz(3)`.
- Indexes match UI filter/sort patterns.

### New finding in this snapshot

**D1 (P2) — Schema and `supabaseAuthId` migration are present but unverified against the live DB.**
- **Evidence:** `prisma/schema.prisma` has `supabaseAuthId String? @unique @db.Uuid`; `prisma/migrations/20261025000000_add_supabase_auth_id/migration.sql` adds `UUID` nullable + unique index. Doc claims applied.
- **Impact:** Nothing until auth code assumes it. Then a `P2021` (column does not exist) or `P2025` (record not found) error would block every login.
- **Verification (safe):**
  ```powershell
  cd api
  npx prisma migrate status
  npm run db:check
  ```
  If both say the second migration is `Applied`, the schema is consistent. To confirm the **column exists**, `npx prisma studio` and inspect the `User` model — a `supabaseAuthId` column should be present.
- **Fix:** Only if status shows it pending or failed. If pending: `npm run prisma:migrate:deploy` (after DB backup). If failed: read `_prisma_migrations` (`SELECT * FROM _prisma_migrations WHERE finished_at IS NULL;`), never edit that table by hand, and consider a fresh migration if the local schema files disagree.

**D2 (P3) — No `ON CONFLICT` upsert strategy on any owned model.**
