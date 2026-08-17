# Recommendations

Recommendations turn configured pacing and anomaly signals into a review queue. Every item includes type, priority, status, confidence, sample size, evidence, potential impact, freshness, generation time, expiration, and optional operational relationships.

## Lifecycle

`new -> reviewed -> approved -> implemented`

An operator may reject or dismiss a new or reviewed item. Repeating the same decision is idempotent. Implemented, rejected, dismissed, and expired items are terminal. Every accepted state transition appends a recommendation action so expected impact can later be compared with actual impact.

Tenant administrators and managers can review and approve. Media buyers can record implementation of an already approved item. Analysts and viewers are read-only. Database RLS and the decision RPC are authoritative; UI permissions only control presentation.

Recommendations do not execute external changes. A future trusted executor would require a separate server-side integration, renewed policy and cap checks, credential isolation, and its own audit trail.
