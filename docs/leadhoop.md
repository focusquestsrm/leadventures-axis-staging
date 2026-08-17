# LeadHoop connector foundation

The LeadHoop adapter translates report fields into Axis's canonical delivery record. Field names are not assumed stable: each tenant/integration owns mappings for transaction ID, lead ID, buyer, status, rejection reason, response time, payout, campaign, and timestamps.

The import sequence is upload → validate → preview/map → finalize → report/reconcile. Invalid rows are never inserted. Preview shows detected, valid, invalid, duplicate, matched, unmatched/review, and warning counts. A user can cancel before finalization.

## Matching hierarchy

1. Exact Axis lead ID
2. Exact trusted external lead ID within the active tenant
3. Trusted transaction/reference ID through the integration's idempotency boundary
4. A future explicitly configured deterministic mapping

Axis never matches on name, email, or phone. Multiple matches become `requires_review`; no match becomes `unmatched`. Buyer matching is exact by normalized configured name or external reference.

## Data minimization

Only mapped operational fields survive normalization. Extra CSV columns—including email, phone, and other identity fields—are dropped. Raw CSV and row payloads are not stored or audited. Errors contain a row number, code, and generic safe message. The bundled demonstration file is synthetic and covers acceptance, cap, duplicate, geography, timeout, and secondary buyer acceptance.
