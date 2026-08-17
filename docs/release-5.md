# Release 5: Recover

Release 5 adds a controlled recovery operating layer for leads rejected during primary delivery. It does not replace Route, alter original delivery history, or perform outbound delivery from the browser.

## Scope delivered

- Recovery dashboard, queue, deterministic funnel, category analysis, and economics
- Recovery detail with PII-safe explanations, consent state, ranked approved paths, and attempt history
- Tenant recovery policy administration and approved-path inventory
- Manual review queue and capability-gated decisions
- Recovery events in the lead journey
- Buyer and program recovery performance
- Synthetic demo scenarios for recovered, blocked, manual-review, and multi-attempt outcomes
- Tenant-owned PostgreSQL recovery model, RLS, relationship guards, audit triggers, idempotency controls, and read-only intelligence RPC

## Execution boundary

The default policy mode is `approval_required`. Approval records and queues an authorized path; it never performs a host post, redirect, webhook, or other outbound delivery. Automatic mode exists only as a forward-compatible schema value. A trusted server-side executor, credential management, retry policy, suppression integration, and live connector certification remain future deployment work.

## Deployment

Apply `202608160007_release_5_recover.sql` to the staging Supabase project after migrations 001–006. Run `supabase/tests/release_5_security.sql` against a disposable or staging validation database. The SQL test is transactional and rolls back its synthetic records.

Release 5 should remain **PASS WITH REMAINING ITEMS** until migration 007 is applied and the live tenant-isolation, approval, audit, and UI validation suite passes in connected staging.
