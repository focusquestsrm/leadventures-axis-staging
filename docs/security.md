# Security

## Authentication and authorization

Supabase Auth handles credentials and sessions. The UI permission map improves usability, but is not the security boundary. PostgreSQL RLS helpers check `auth.uid()`, platform status, active membership, and allowed tenant roles. Administrative profile fields have no user update policy; platform elevation is service-administered.

Roles are `platform_admin`, `tenant_admin`, `manager`, `media_buyer`, `analyst`, and `viewer`. Application permission checks use `src/lib/rbac.ts`; new capabilities should add a named permission there and a corresponding database policy.

`platform_admin` is a profile-level capability and is forbidden as a tenant membership role by UI validation and a database constraint. Platform administration does not implicitly grant lead identity access. A platform administrator must also hold a direct active `tenant_admin` or `manager` membership in the tenant to access identity data.

## PII

- Operational workflows query `leads`, not `lead_identity`.
- Identity reads are restricted to platform administrators, tenant administrators, and managers.
- Sensitive attributes are classified separately.
- PII must not be placed in URLs, logs, analytics, errors, or audit metadata.
- Integration credentials belong in a secrets manager; only a reference may be stored.
- No identity fields may be sent to an AI service.

Encryption at rest and transport protections are supplied by the configured database provider; field-level encryption and masking can be added behind the isolated identity boundary.

## Audit and secrets

Database triggers capture mutations for tenant, membership, buyer, offer, program, lead, and integration records. Audit metadata records the operation only and excludes row content. Audit events are append-only to authenticated application users.

Normal authenticated users receive no insert, update, or delete grant on `audit_events`; security-definer mutation triggers perform capture. Membership creation, role change, deactivation/reactivation, and removal receive distinct event types.

Secret-bearing `.env*` files are ignored except `.env.example`. The anon key is intended for browser use and remains constrained by RLS. Never place service keys, JWT secrets, database passwords, or vendor credentials in client environment variables.

## Compliance foundation

Release 1 makes no legal claims. Future consent, TCPA evidence, suppression, DNC, revocation, privacy request, retention, and access review records should be separate tenant-owned tables with RLS, retention policies, and audit coverage.
