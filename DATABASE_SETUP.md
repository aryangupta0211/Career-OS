# Supabase and Prisma database setup

CareerOS uses PostgreSQL on Supabase and Prisma 7.10. The Prisma schema and an initial SQL migration are checked into `prisma/`. The app remains in browser-local demo mode until authentication and a user-scoped API data provider are implemented.

## 1. Create or select a Supabase project

1. Create a Supabase project and keep its database password private.
2. In the Supabase dashboard, open **Project Settings → Database → Connection string**.
3. Copy a PostgreSQL connection URI. For a local migration workflow, prefer the direct database connection when your network supports IPv6, or the **Session pooler** connection when it does not. Do not use a transaction-pooler URL for Prisma migrations.
4. Ensure TLS is enabled with `sslmode=verify-full`.

The direct host supplied for this workspace currently resolves only to IPv6; the active environment reports `ENOTFOUND` in Node.js and cannot reach port 5432. If you see this, copy the session-pooler URI from Supabase and use its host, port, and username instead.

## 2. Store the URL privately

Backend environment values belong in `api/.env`. The file is ignored by Git. Start from the safe template if needed:

```powershell
Copy-Item api/.env.example api/.env
```

Set `DATABASE_URL` to your Supabase PostgreSQL URI, for example:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full
```

Replace placeholders with the dashboard values. URL-encode reserved characters in the username or password (for example, `#` becomes `%23`). Never paste the resulting URL into source files, issues, logs, or commits, and never commit `.env`.

`PORT`, `WEB_ORIGIN`, and `NODE_ENV` are optional and have validated development defaults. Prisma's CLI and the API both load `api/.env` directly.

## 3. Verify connection before database changes

```powershell
npm run db:check
```

This makes a connection and lists public table names only. It does not read user records or change the database. Inspect the output before migrating:

- If the public schema has no non-Prisma tables, proceed only after reviewing the initial migration.
- If any existing CareerOS or unfamiliar application tables are listed, stop. Do not run the initial migration until you have confirmed the database's ownership and created a backup/baseline plan.
- If the connection fails, check the host, port, password encoding, TLS settings, project status, and pooler choice. The application remains usable in local demo mode; API health reports the database as unavailable.

The `DATABASE_URL` currently configured for this workspace cannot be reached from its network, so the connection check and migration have not succeeded here.

## 4. Review and apply migrations

Validate and generate the Prisma client:

```powershell
npm run prisma:validate
npm run prisma:generate
```

`prisma/migrations/20261023000000_initial/migration.sql` is generated from the schema. Review it before applying. It creates the seven domain tables, enums, indexes, uniqueness constraints, and same-user foreign keys; it contains no `DROP`, `TRUNCATE`, or data deletion statements.

For local development against a new, disposable PostgreSQL database, create later migrations with:

```powershell
npm run prisma:migrate --workspace @careeros/api -- --name describe_change
```

Inspect and retain each generated migration. For an explicitly selected and verified empty development Supabase project, apply the reviewed checked-in migrations with:

```powershell
npm run prisma:migrate:deploy
```

`migrate deploy` applies migrations; it does not reset the schema. Never run `migrate dev`, `db push`, reset, drop, or a migration against an unknown or production database. Keep database backups and use a separate development Supabase project for migration work.

## Schema relationships and deletion policy

- `User` owns every record; email is unique per user table.
- `Company`, `Contact`, `JobApplication`, `Task`, `Event`, and `Activity` store the owner ID. Composite foreign keys prevent linking records across users.
- Deleting a user cascades to the user's records. Deleting a referenced company, contact, or application is restricted; unlink/reassign dependent records in a reviewed transaction first.
- Tasks and events are separate entities. Task due dates and event start/end values are timezone-aware PostgreSQL timestamps. Companies support a PostgreSQL text-array of tags.
- IDs use CUIDs consistently. Statuses and categories use PostgreSQL enums.

## Demo data and authentication

The frontend's `DemoCareerDataProvider` continues to read/write `careeros-demo-v1` in the current browser. Settings can export a JSON backup on demand. No local data is uploaded to Supabase. There is no automated importer, authentication, user-scoped CRUD API, seed command, or connected frontend data provider.

The Prisma singleton is server-side only. Do not expose it through unauthenticated endpoints. Before CRUD is added, integrate a trusted auth identity, derive `userId` from that identity on the server, validate every related record against that owner, and add transaction-backed repository/service operations.

## Troubleshooting and handoff

- `npm run db:check` is read-only and reports an error code without exposing the connection URL.
- `GET http://localhost:3001/api/health` reports database state; `foundation-only` means no data CRUD exists even when the connection succeeds.
- If direct IPv6 connectivity is unavailable, use Supabase's session-pooler URI from the dashboard.
- Keep `.env` private and rotate a database password if it was pasted into a chat, ticket, or other shared system.
- Before public deployment, add authentication and authorization, secure CRUD, request validation, connection-pool sizing, migrations/backup procedures, and integration tests.
