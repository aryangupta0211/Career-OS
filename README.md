# CareerOS

CareerOS is a career-management workspace for applications, companies, contacts, tasks, and scheduled events. The current UI remains usable with browser-local demo data; PostgreSQL and Prisma are prepared as a backend foundation, but authentication and database-backed CRUD are not yet implemented.

## Features

- Responsive overview with data-derived metrics, a compact monthly calendar, upcoming tasks, and recent applications.
- Shared monthly calendar on the Overview and Calendar pages, with local-date-safe navigation, event/task indicators, selected-day details, and create/edit/delete actions.
- Editable Applications, Companies, Contacts, Tasks, and Events with browser-local persistence.
- Light and dark themes, persisted in this browser.
- Explicit demo mode and a user-triggered JSON export from Settings.
- Express health endpoint with database connection status; no unauthenticated record API.

## Stack

- React 19, strict TypeScript, Vite 7, Tailwind CSS 4, React Router 7
- TanStack Query, React Hook Form, Zod, date-fns, Lucide React
- Node.js, Express 5, Pino HTTP logging
- PostgreSQL, Prisma 7.10, `@prisma/adapter-pg`, and `pg`
- Vitest and Oxlint

## Project layout

```text
api/
  src/db/              Prisma singleton and read-only connection check
  src/                 Express app, configuration, and server lifecycle
  prisma.config.ts     Prisma 7 CLI configuration
  .env.example         Backend environment template
prisma/
  schema.prisma        PostgreSQL domain schema
  migrations/          Reviewed SQL migrations
src/
  components/          App shell, forms, and reusable monthly calendar
  context/             Demo data and persisted theme providers
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

The UI currently uses `DemoCareerDataProvider`. Editable demo records are saved to this browser's `localStorage` under `careeros-demo-v1`; they are not shared, authenticated, or synchronized. Existing browser data is retained. Settings can download a JSON backup; nothing is uploaded automatically. There is no import or cloud migration flow yet.

The sidebar labels this as a demo workspace. A configured database connection does not change the UI data provider or imply that the demo records are synchronized.

## Database architecture

Prisma models users, companies, contacts, job applications, tasks, events, and activity. Related records carry `userId`; composite foreign keys also enforce same-user company/contact/application ownership. User-owned records cascade only when the user is deleted. Deleting a referenced company, contact, or application is restricted until dependent links are removed or reassigned. Dates use PostgreSQL `timestamptz`; IDs use consistent CUIDs.

Events and tasks remain separate records. The shared calendar derives day indicators and selected-day details from both collections; completed tasks are omitted. The initial schema and migration are in `prisma/`.

## API and authentication boundary

`GET /api/health` reports API status and whether the database is connected, unavailable, configured, or not configured. The server's Prisma singleton is not exposed through record routes. There is no authentication, authorization, repository/service CRUD, or database-backed frontend provider. Do not add public data endpoints or accept client-supplied `userId` as proof of ownership. Secure authentication and user-scoped validation must be integrated before database CRUD or public deployment.

## Limitations

- Supabase credentials may be configured locally in the ignored `api/.env`, but this environment cannot currently resolve/connect to the supplied Supabase database host. No migration has been applied and database connectivity is not claimed.
- Demo data is not imported into PostgreSQL.
- No seed script, authentication, database CRUD, calendar sync, or external reminders are implemented.
- Public deployment requires authentication, authorization, rate limiting, production CORS/secrets, migration operations, and integration tests.
