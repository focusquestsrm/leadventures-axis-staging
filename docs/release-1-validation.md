# Release 1 Validation Report

Validation date: 2026-08-16
Environment: `leadventures-axis-staging` only
Status: **PASS WITH REMAINING ITEMS**

## Scope and results

The application architecture, environment handling, centralized RBAC, tenant context, service boundary, migration, seed, and documentation were reviewed. Missing Release 1 membership and registry workflows were implemented without redesigning the application or starting Release 2.

Local validation passed:

- ESLint with zero warnings
- TypeScript strict typecheck
- Unit tests for RBAC, PII least privilege, tenant role assignment, demo-mode production guard, tenant-scoped reads, and tenant-scoped writes
- Vite production build

The local Vite server returned HTTP 200 with the expected root mount and Lead Ventures Axis title. The in-app browser connection was unavailable, so interactive form, login, visual, and responsive smoke testing remains pending.

The database migration and SQL security suite could not be executed because this workspace has no staging Supabase variables, Supabase CLI, PostgreSQL client, Docker runtime, or linked project configuration. The migration must not be marked applied until it runs against the intended staging project.

## RBAC behavior

- `platform_admin` is profile-level and can administer tenant records across the platform.
- `tenant_admin` manages authorized tenant settings, memberships, registries, and integrations.
- `manager` manages operational registries but not tenant or integration administration.
- `media_buyer`, `analyst`, and `viewer` receive their centralized read permissions.
- `viewer` has no write permission.
- `platform_admin` cannot be assigned through a tenant membership.
- Platform administration alone does not grant lead identity access.

UI controls call the centralized permission model. PostgreSQL policies and constraints independently enforce authorization.

## Tenant isolation and switching

Registry queries include the active `tenant_id`. The service accepts only an authorized tenant context, and switching clears cached tenant records before fetching the next workspace. RLS checks membership on every database request. Cross-tenant triggers validate program/offer, buyer/offer, lead/program, lead/offer, and lead/identity relationships.

The unexecuted transactional SQL suite proves, when run, that Tenant A and Tenant B cannot read or mutate each other's data even with direct IDs.

## PII handling

Operational lead forms and routes contain no identity fields. `lead_identity` is separate and absent from normal snapshot queries, URLs, logs, errors, and audit metadata. Database policies require a direct active `tenant_admin` or `manager` membership; platform status alone is insufficient. Release 1 does not expose an identity UI, so masking is reserved for a future authorized identity workflow.

## Audit behavior

Security-definer triggers record tenant, membership, buyer, program, offer, buyer-offer, lead, integration, tenant-setting, feature-flag, and branding mutations. Metadata contains only the operation. Normal authenticated users have no audit insert/update/delete grant.

## Administrative workflows

- Dynamic tenant creation and activation state changes
- Membership listing for the active tenant
- Add an existing Supabase Auth user by UUID
- Assign or change a tenant-scoped role
- Disable or reactivate a membership
- Browser-based email invitation is intentionally blocked; it requires a trusted server or Edge Function

## Registry workflows

- Create/edit operational leads without PII
- Create/edit buyers with external identifiers and notes
- Create/edit programs with code and category
- Create/edit offers and program assignment
- Register/edit integration metadata without accepting raw credentials

## Environment validation

Only `.env.example` is present. `.env`, `.env.local`, `.env.production`, `.env.staging`, and all `.env.*` files are ignored except the example. Repository scans found no credential assignments, service-role values, tokens, private keys, or common real-email domains. Browser variables are limited to the Supabase URL, anon key, and demo flag.

## Required staging completion

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the staging project only.
2. Link/install the Supabase CLI or use a trusted PostgreSQL migration runner.
3. Apply `202608160001_release_1_foundation.sql` without resetting shared staging data.
4. Run `supabase/tests/release_1_security.sql` with `ON_ERROR_STOP=1`.
5. Create synthetic Auth users for all six roles and perform connected-browser authentication smoke tests.
6. Provision an invitation Edge Function if email invitations are required for Release 1 operations.
7. Complete interactive desktop/mobile visual QA when the browser validation connection is available.

Release 1 should remain open until the migration, RLS suite, and connected authentication/browser tests pass against the intended staging project.
