# Supabase and Prisma database setup

CareerOS uses PostgreSQL on Supabase and Prisma 7.10. The Prisma schema and SQL migrations are checked into `prisma/`. Browser-local demo mode remains the default; optional API mode uses Supabase email authentication and owner-scoped record endpoints.

## 1. Create or select a Supabase project

1. Create a Supabase project and keep its database password private.
2. In the Supabase dashboard, open **Project Settings → Database → Connection string**.
3. Copy a PostgreSQL connection URI. For a local migration workflow, prefer the direct database connection when your network supports IPv6, or the **Session pooler** connection when it does not. Do not use a transaction-pooler URL for Prisma migrations.
4. Ensure TLS is enabled with `sslmode=verify-full`.

Last verified on 2026-10-29: after explicit project-owner approval, both feature migrations were deployed to the configured project. Read-only status reports all four migrations applied; the added columns have the expected types/defaults, and `prisma migrate diff` reports no schema difference. The configured frontend, backend, and database project references agree.

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

The current environment's read-only connection check succeeds and finds the application tables. All four migrations are now recorded as applied. The final read-only `prisma migrate diff` reports no schema differences.

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
- Deleting a user cascades to the user's records. The demo provider preserves the current UX by unlinking optional references to a deleted company, contact, or application before removing that item. Database-backed deletion must perform the same unlink-and-delete operation in one Prisma transaction; foreign-key restrictions remain in place so a partial operation cannot silently orphan references.
- Tasks and events are separate entities. Task due dates and event start/end values are timezone-aware PostgreSQL timestamps. Companies and contacts support PostgreSQL text-array tags.
- IDs use CUIDs consistently. Record statuses use PostgreSQL enums; task category is optional text.

## Demo data and authentication

The frontend defaults to `VITE_DATA_MODE=demo`; `DemoCareerDataProvider` reads and writes `careeros-demo-v1` in the current browser. Settings can export a JSON backup, and local demo records are not uploaded automatically. There is no automated importer.

To opt into API mode, set `VITE_DATA_MODE=api` and configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the frontend. Configure the matching `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `api/.env`. Token verification calls `supabase.auth.getUser(token)` and uses the least-privileged supported server configuration; a service-role key is not required solely to verify tokens. The API requires a confirmed email and resolves an internal user by Supabase UUID. Email alone is never used to link accounts.

The API reads `api/.env` relative to its config module at startup and requires the exact backend variable names `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The frontend-only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` names do not configure the API. After changing `api/.env`, restart the API process. `AUTH_NOT_CONFIGURED` means one or both backend variables are missing; it does not mean a bearer token was accepted or rejected.

`POST /api/auth/provision` verifies a confirmed identity before creating its internal-user mapping. Authenticated `GET /api/data` reads the user's records; `POST /api/data/:kind` creates a record, and `PATCH`/`DELETE /api/data/:kind/:id` update or remove one. Supported kinds are `company`, `application`, `contact`, `task`, and `event`. The server derives `userId` from the verified mapping, validates related records against the same owner, returns owner-scoped 404s for unavailable records, and transactionally unlinks optional references before deletion. Activities are included in reads and unlinking but are not directly editable from the current UI. These endpoints use the Prisma singleton only behind authentication.

## Troubleshooting and handoff

- `npm run db:check` is read-only and reports an error code without exposing the connection URL.
- The API build copies `prod-ca-2021.crt` to `api/dist/`; Supabase database connections require that certificate and use `rejectUnauthorized: true`. The API refuses a Supabase TLS connection if the certificate is missing.
- `GET http://localhost:3001/api/health` reports database state and the `authenticated-api` mode.
- If an authenticated `GET /api/data` returns `DATABASE_SCHEMA_OUTDATED`, compare the deployed database with the Prisma schema using `prisma migrate status` and `prisma migrate diff`. The current configured database has all four migrations applied and no schema difference.
- If direct IPv6 connectivity is unavailable, use Supabase's session-pooler URI from the dashboard.
- Keep `.env` private and rotate a database password if it was pasted into a chat, ticket, or other shared system.
- Before public deployment, complete authenticated API integration tests, rate limiting, production CORS/secrets review, connection-pool sizing, and migration/backup procedures.
