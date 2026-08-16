# Release 2 — Lead Ecosystem

## Objective

Release 2 records the complete operational journey from acquisition context through buyer delivery outcomes. A lead is never reduced to a single buyer relationship. `lead_deliveries` groups a delivery sequence while ordered `lead_delivery_attempts` preserve every buyer interaction, including rejection, timeout, error, and eventual acceptance.

Release 2 does not make autonomous routing decisions, recommend pacing, forecast demand, buy media, or fabricate downstream performance.

## Delivered capabilities

- Tenant-owned traffic-source and campaign registries
- Expanded non-PII lead context and lifecycle status
- Buyer operating profiles, buyer-program eligibility, flexible rules, and caps
- Offer/program many-to-many foundation
- Parent deliveries, ordered attempts, structured rejections, and status history
- Lead journey, lead detail, buyer detail, Route operations, and capacity views
- Synthetic demo journeys covering cap rejection, geography rejection, secondary acceptance, and timeout
- Central RBAC permissions, RLS, cross-tenant relationship guards, audit triggers, and regression contracts

## Lead journey model

```text
lead
  ├─ lead_status_history (ordered lifecycle transitions)
  └─ lead_deliveries
       └─ lead_delivery_attempts (attempt_number preserves order)
            └─ lead_rejections (structured reason for a rejected attempt)
```

An accepted attempt does not imply a final commercial outcome. Enrollment, start, revenue, and margin remain future metrics.

## Deployment

Apply `202608160004_release_2_lead_ecosystem.sql` through the normal Supabase staging migration workflow. Run `supabase/tests/release_2_security.sql` against the migrated staging/local database in a transaction. The optional `supabase/seed.sql` adds only clearly synthetic demo data.

## Release boundary

Release 3 must not begin until the R2 migration and transactional security suite pass in the connected staging Supabase project and the deployed authenticated UI is validated against that live data.
