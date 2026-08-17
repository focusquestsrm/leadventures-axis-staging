# Integration Readiness

LeadHoop, CRM outcome, media and file-import surfaces use tenant-scoped metadata, field mappings, validation summaries, safe errors, idempotency keys, lineage and reconciliation counts. CSV parsing is limited to 5 MB, 10,000 data rows, 200 columns and 10,000 characters per cell; malformed quotes and excess values are rejected. Database import RPCs impose independent bounds.

Credential values, access/refresh tokens, signing secrets and raw provider payloads are prohibited from browser tables, URLs, logs, audit metadata and `VITE_` variables. Production credentials must use a server-side secrets manager with rotation and access review.

Before launch, certify every provider’s scopes, rate limits, mapping contract, retry/idempotency behavior, reconciliation, stale-sync alert, redaction, credential rotation and disconnect procedure using non-production credentials first.
