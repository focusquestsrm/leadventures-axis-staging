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
- Delivery attempts and rejections store status, timing, references, payout, and redacted operational reasons only. Full request/response bodies are prohibited.
- The workspace service queries `lead_identity` only for a direct active `tenant_admin` or `manager` membership. Platform status alone is insufficient.

Encryption at rest and transport protections are supplied by the configured database provider; field-level encryption and masking can be added behind the isolated identity boundary.

## Audit and secrets

Database triggers capture mutations for tenant, membership, buyer, offer, program, lead, and integration records. Audit metadata records the operation only and excludes row content. Audit events are append-only to authenticated application users.

Release 2 extends safe audit capture to traffic sources, campaigns, buyer-program relationships, buyer rules, buyer caps, deliveries, attempts, rejections, and status history. Metadata continues to contain identifiers and operation names—not identity fields, reasons containing PII, or delivery payloads.

## Release 2 authorization

- All active tenant roles may read operational R2 data.
- `tenant_admin` and `manager` may mutate buyer, capacity, delivery, and lifecycle records.
- `media_buyer` may manage traffic sources and campaigns but cannot create delivery attempts or caps.
- `analyst` and `viewer` remain read-only.
- RLS is authoritative; client capability checks only shape the interface.

## Release 3 intelligence security

The `axis_intelligence_snapshot` RPC is read-only and `SECURITY INVOKER`, so table RLS continues to apply. It rejects unauthenticated callers and any tenant ID for which `axis_is_tenant_member` is false. Platform administrators receive only the intentionally authorized operational intelligence already allowed by the existing tenant helper; platform status still does not grant lead identity access.

All tenant roles can consume approved read-only intelligence consistent with their existing operational read grants. No intelligence RPC exposes mutation operations. Viewer and analyst roles therefore cannot modify source data through analytics. Source/campaign filter options, aggregate counts, buyer/program labels, and drill-down identifiers all originate from the active tenant scope.

The intelligence migration never queries `lead_identity` or identity attributes. Responses omit names, emails, phones, addresses, request bodies, tokens, and credentials. Operational lead IDs may be used for authorized drill-down; existing lead-detail permissions remain responsible for any separate identity lookup.

Normal authenticated users receive no insert, update, or delete grant on `audit_events`; security-definer mutation triggers perform capture. Membership creation, role change, deactivation/reactivation, and removal receive distinct event types.

Secret-bearing `.env*` files are ignored except `.env.example`. The anon key is intended for browser use and remains constrained by RLS. Never place service keys, JWT secrets, database passwords, or vendor credentials in client environment variables.

## Compliance foundation

Release 1 makes no legal claims. Future consent, TCPA evidence, suppression, DNC, revocation, privacy request, retention, and access review records should be separate tenant-owned tables with RLS, retention policies, and audit coverage.

## Release 4 integration security

All integration mappings, imports, syncs, errors, and outcomes have RLS plus tenant-relationship triggers. Members may read their tenant's operational records; only tenant administrators and managers may mutate them or finalize imports. Cross-tenant integration, batch, lead, buyer, and program references fail at the database boundary.

Normalization allowlists operational fields and drops unmapped report columns. Raw files and submitted row bodies are not placed in database records, logs, errors, or audit metadata. Audit triggers record table operation and identifiers through the generic PII-safe audit function. Outcome intelligence is `SECURITY INVOKER`, tenant-authorized, read-only, and excludes identity data.

Connector credentials and webhook signing secrets require server-side provisioning. The browser UI deliberately contains no password/secret input and the application bundle uses no vendor secret or service-role environment variable.
