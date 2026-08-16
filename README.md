# Lead Ventures Axis — Staging

Release 1 of **Lead Ventures Axis**, the secure multi-tenant foundation for an AI-powered lead acquisition and orchestration platform.

> This repository and its configuration are for **staging and local development only**. Do not reuse staging credentials, seed data, or environment values in production.

## Included

- Supabase Auth sign-in and session handling
- Dynamic tenant workspaces and authorized tenant switching
- Centralized role/permission model for six roles
- Platform tenant administration and tenant membership management
- Overview and five Axis engine navigation shells
- Lead, buyer, offer/program, and integration registry create/edit workflows
- PostgreSQL schema, row-level security, tenant relationship guards, and audit triggers
- Separate sensitive lead identity storage
- Optional, synthetic browser demo and database seed data

## Local startup

Requirements: Node.js 22+ and npm. For a connected environment, also install the Supabase CLI or use a hosted staging Supabase project.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

`VITE_ENABLE_DEMO_MODE=true` enables an in-memory, synthetic local demonstration only while Vite is in development mode. Set it to `false` to exercise real authentication and database access.

The sidebar labels demo mode as **Synthetic demo · staging**. Production builds always disable the demo adapter regardless of the variable value.

## Connected staging setup

1. Create or select a staging-only Supabase project.
2. Apply migrations with `supabase db push` (linked staging project) or `supabase db reset` (local database).
3. Populate `.env.local` with the staging project URL and anon key.
4. Set `VITE_ENABLE_DEMO_MODE=false`.
5. Create an Auth user. The database trigger creates a least-privileged profile automatically.
6. For the first platform operator only, set `profiles.is_platform_admin = true` through the Supabase SQL editor or another service-role administrative process.
7. Optionally run `supabase/seed.sql`. It contains synthetic `.example.test` identity data only.

Membership administration accepts an existing Supabase Auth user UUID. Actual email invitation requires a trusted server/Edge Function using service-role credentials and is intentionally unavailable in the browser.

Never expose a Supabase service-role key in a `VITE_` environment variable or browser bundle.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

After applying the migration, run the transactional RLS suite with a PostgreSQL client configured for the staging database:

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/release_1_security.sql
```

The script uses synthetic records and rolls back. Never place `STAGING_DATABASE_URL` in a browser variable or committed file.

See [architecture](docs/architecture.md), [security](docs/security.md), [multi-tenancy](docs/multi-tenancy.md), [Release 1 scope](docs/release-1.md), and the [Release 1 validation report](docs/release-1-validation.md).
