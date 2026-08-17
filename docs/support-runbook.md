# Support Runbook

Do not request passwords, tokens, raw lead payloads or PII in tickets. Record tenant-safe IDs, time, route, operation and safe diagnostic code.

| Incident | Safe response |
|---|---|
| Cannot log in | Check auth status/redirects, user existence and generic error; reset through approved auth process. |
| Tenant sees no data | Verify active membership, selected tenant, RLS diagnostics and migration state; never bypass RLS. |
| Import failed | Inspect batch counts/safe errors, mapping and limits; retry only with idempotency/reconciliation. |
| Integration stale | Check last success, sync run and server credential health; rotate credentials server-side. |
| Permission/RLS issue | Reproduce with same role in synthetic tenant; inspect policy and audit event; do not elevate casually. |
| Automation failed | Pause if risk exists; review gates, approvals, breaker and safe execution record. |
| Recovery blocked | Preserve consent/suppression block; verify policy/evidence; never override without authorized review. |
| Data mismatch | Stop imports/actions, compare lineage and aggregates, preserve evidence, reconcile before replay. |
| Rollback needed | Enable kill switch if needed, confirm available restore state, obtain authority, execute and verify audit trail. |

Escalate suspected cross-tenant access, credential exposure or PII leakage immediately to security/incident owners and preserve logs without copying sensitive content.
