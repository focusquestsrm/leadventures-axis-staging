# Closed-loop outcomes

`lead_outcomes` represents what happened after delivery. Canonical types are `contacted`, `qualified`, `appointment`, `application`, `enrollment`, `sale`, `start`, `completed`, `cancelled`, `lost`, and `other`. Tenant/integration-scoped mappings translate vendor terminology explicitly; Axis rejects unmapped values instead of guessing.

Each outcome records the Axis lead, integration, external outcome ID, stage, status, occurrence time, optional monetary value and currency, optional buyer/program, source system, external record ID, ingestion time, and optional size-limited PII-safe metadata. Unique external IDs make ingestion idempotent.

Lineage supports outcome → lead → campaign/source and outcome → lead → buyer/program. Release 4 implements deterministic single-source operational attribution only, not multi-touch attribution.

The lead journey distinguishes lifecycle, delivery, and external outcome events. Intelligence counts distinct matched leads for outcome rates and uses monetary values only when present. Missing economics remain unavailable; Axis never fabricates cost, revenue, or gross contribution.
