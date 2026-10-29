# CareerOS

CareerOS is a career-management workspace for applications, companies, contacts, tasks, and scheduled events. It supports browser-local demo data and an optional authenticated, user-scoped PostgreSQL API mode.

## Features

- Responsive overview with data-derived metrics, a compact monthly calendar, upcoming tasks, and recent applications.
- Shared monthly calendar on the Overview and Calendar pages, with local-date-safe navigation, event/task indicators, selected-day details, and create/edit/delete actions.
- Editable Applications, Companies, Contacts, Tasks, and Events with browser-local persistence.
- Light and dark themes, persisted in this browser.
- Explicit demo mode and a user-triggered JSON export from Settings.
- Supabase email authentication and server-verified API access.
- Owner-scoped API CRUD for companies, applications, contacts, tasks, and events, with activity history reads.
- Express health endpoint with database connection status; record routes require authentication.

## Stack

- React 19, strict TypeScript, Vite 7, Tailwind CSS 4, React Router 7
- TanStack Query, React Hook Form, Zod, date-fns, Lucide React
- Node.js, Express 5, Pino HTTP logging
- PostgreSQL, Prisma 7.10, `@prisma/adapter-pg`, and `pg`
- Vitest and Oxlint

## Project layout

```text
api/
  src/auth/            Supabase verification, internal-user mapping, and provisioning
  src/data/             Authenticated owner-scoped record API
  src/db/              Prisma singleton and read-only connection check
  src/                 Express app, configuration, and server lifecycle
  prisma.config.ts     Prisma 7 CLI configuration
  .env.example         Backend environment template
prisma/
  schema.prisma        PostgreSQL domain schema
  migrations/          Reviewed SQL migrations
src/
  components/          App shell, forms, and reusable monthly calendar
  context/             Demo/API data, auth, and persisted theme providers
  data/                Demo records and tests
  lib/                 Calendar date helpers
  pages/               Overview, directories, tasks, calendar, settings
```

## Local development

Requirements: Node.js 22+ and npm 10+.

```powershell
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`; Express runs at `http://localhost:3001`. The frontend is proxied to the API for `/api` requests. Configure backend settings in `api/.env`; see [DATABASE_SETUP.md](./DATABASE_SETUP.md) for Supabase and Prisma instructions.

Useful checks:

```powershell
npm test
npm run lint
npm run build
npm run build:api
npm run prisma:validate
npm run prisma:generate
npm run db:check
```

## Data modes and preservation

`VITE_DATA_MODE` defaults to `demo`. In demo mode, editable records are saved to this browser's `localStorage` under `careeros-demo-v1`; existing browser data is retained and can be downloaded from Settings. Nothing is uploaded automatically. There is no import or cloud migration flow yet.

In the profile menu, signed-out users can open **Sign in** or **Create account** even while demo mode is active. To use real Supabase authentication, add the project URL and publishable key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the frontend environment, and as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `api/.env`. Set `VITE_DATA_MODE=api` to select the authenticated API provider; the default remains `demo`. API mode does not import demo records. Confirmed Supabase identities are mapped to internal users by Supabase UUID; email alone is never used to link accounts. The server verifies each bearer token with `supabase.auth.getUser(token)` and rejects unconfirmed identities. No service-role key is required for token verification.

The frontend calls relative `/api` endpoints. Vite proxies these requests to `http://localhost:3001` in development; production hosting must provide a same-origin `/api` reverse proxy. There is no separate API base URL setting.

For local Supabase Auth, set the dashboard Site URL to `http://localhost:5173` and allow redirects to `http://localhost:5173/auth/confirm` and `http://localhost:5173/auth/recovery`. Sign-up requires email confirmation before API access.

## Database architecture

Prisma models users, companies, contacts, job applications, tasks, events, and activity. Related records carry `userId`; composite foreign keys also enforce same-user company/contact/application ownership. User-owned records cascade only when the user is deleted. Deleting a referenced company, contact, or application is restricted until dependent links are removed or reassigned. Dates use PostgreSQL `timestamptz`; IDs use consistent CUIDs.

Events and tasks remain separate records. The shared calendar derives day indicators and selected-day details from both collections; completed tasks are omitted. The schema and reviewed SQL migrations are in `prisma/`.

## API and authentication boundary

`GET /api/health` reports API status and database connection state. `POST /api/auth/provision` verifies a confirmed Supabase identity before creating its internal mapping. `GET /api/data` returns the authenticated user's records; `POST /api/data/:kind` and `PATCH`/`DELETE /api/data/:kind/:id` perform owner-scoped operations for the singular kinds `company`, `application`, `contact`, `task`, and `event`. The server derives the owner from the verified internal mapping, checks every related record against that owner, and unlinks optional references transactionally before deleting referenced records. Client-supplied `userId` is never accepted as proof of ownership.

## Limitations

- Last verified on 2026-10-29: after explicit project-owner approval, both feature migrations were deployed. Read-only status reports all four migrations applied, the three columns have the expected types/defaults, and Prisma reports no schema difference.
- Live signup/login/email delivery and authenticated user-data CRUD have not been tested end-to-end. Use authorized test accounts before relying on live persistence or cross-user isolation.
- Demo data is not imported into PostgreSQL.
- Supabase environment variable names are configured locally for the frontend and API, but live signup/login/email delivery and user-data CRUD have not been tested. The database schema is current; authenticated CRUD still needs live verification.
- No seed script, automated demo-data importer, calendar sync, or external reminders are implemented.
- Public deployment still requires production auth/project configuration, rate limiting, CORS/secrets review, migration/backup procedures, and API integration tests.
