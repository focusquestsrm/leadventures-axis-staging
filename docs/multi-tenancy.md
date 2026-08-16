# Multi-tenancy

Tenants are dynamic database records; no customer name controls application behavior. The optional FocusQuest Demo tenant is ordinary removable seed data.

## Isolation controls

1. Every tenant-owned table has `tenant_id`.
2. RLS is enabled on every application table.
3. Security-definer helper functions test platform administration or an active membership using the authenticated user ID.
4. Read policies require membership; mutation policies require named privileged roles.
5. Additional triggers reject cross-tenant relationships that ordinary foreign keys cannot detect.
6. The data-access layer adds the active `tenant_id` to each registry query, and the UI filters again for the selected workspace.
7. Tenant switching clears prior tenant-owned collections before the new scoped query resolves.

Platform administrators can administer tenants across the platform. Tenant administrators remain limited to active memberships. Users with multiple memberships can switch among only authorized contexts. Disabling a membership immediately removes database access for that tenant on the next request.

The transactional security suite at `supabase/tests/release_1_security.sql` exercises both isolation directions, explicit foreign IDs, forbidden writes/deletes, viewer restrictions, PII restrictions, cross-tenant relationships, membership escalation, and audit immutability.

## Adding a tenant-owned entity

Add a UUID primary key, non-null tenant foreign key, timestamps, useful creator reference, tenant index, RLS enablement, read/write policies, and cross-tenant relationship validation. Add safe audit capture where mutations are material. Do not use client-provided tenant context without RLS verification.
