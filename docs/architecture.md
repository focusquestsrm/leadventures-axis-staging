# Architecture

## Application layers

The React/Vite client is organized around explicit boundaries:

- `src/components`: reusable presentation and application shell
- `src/context`: authenticated user and authorized tenant context
- `src/lib/rbac.ts`: the single client permission vocabulary and role grant map
- `src/services`: data-access boundary; components do not query Supabase directly
- `supabase/migrations`: authoritative PostgreSQL schema and security controls

The browser uses the public Supabase anon key. Authentication produces a user JWT; PostgreSQL row-level security is the final authority for every query. A service-role key is neither required by nor permitted in the client.

After authentication, the service loads authorized tenants and memberships, selects an authorized tenant, and adds an explicit `tenant_id` predicate to every registry query. Tenant switching clears cached tenant-owned collections before loading the next context. RLS remains authoritative if a tenant ID is manipulated outside the UI.

## Data model

All primary identifiers are UUIDs. Tenant-owned records carry a non-null `tenant_id`. Operational `leads` are separated from `lead_identity`; routine flows use lead IDs and do not load identity fields. `lead_attributes` carries an explicit classification to support future granular access.

Programs group tenant offers; buyer/offer participation uses an explicit join entity. Release 2 adds `offer_programs` for future many-program offers and `buyer_programs` for buyer eligibility, payout, and priority. Integration rows reference secrets stored outside the database rather than containing credentials.

## Release 2 lead ecosystem

`traffic_sources` and `campaigns` describe acquisition context without embedding vendor-specific schemas. Operational leads reference a source, campaign, program, and offer while identity remains in `lead_identity`.

`lead_deliveries` is a parent execution record. Its one-to-many `lead_delivery_attempts` retain buyer order and outcomes, so a rejection followed by a different buyer acceptance is preserved. `lead_rejections` belongs to the exact rejected attempt. `lead_status_history` provides an ordered lifecycle independent of delivery outcomes.

Buyer operating data remains normalized: `buyer_programs` models eligibility, `buyer_rules` stores extensible typed rule metadata, and `buyer_caps` stores period allocations and delivered counts. Utilization and remaining capacity are derived values; no pacing recommendation is persisted in Release 2.

## Extensibility

The Acquire, Convert, Route, Recover, and Optimize areas share tenant context, RBAC, audit, and registry foundations. Acquire and Route receive operational R2 views; Convert, Recover, and Optimize retain their forward-compatible foundations. `tenant_branding`, `tenant_settings`, and tenant-scoped `feature_flags` allow later commercialization and white labeling without customer-specific logic.

## Migration process

Create forward-only, timestamped SQL migrations in `supabase/migrations`. Review every policy and tenant relationship before applying. Test locally with `supabase db reset`, then apply to the linked staging project with `supabase db push`. Never edit already-applied migration history.
