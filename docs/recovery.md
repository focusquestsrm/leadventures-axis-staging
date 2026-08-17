# Recovery engine

## Deterministic eligibility

`src/recovery/domain.ts` is the canonical browser-side evaluation vocabulary. A recovery requires a matching active tenant policy, a selected recoverable rejection category, an allowed lead age, remaining attempts, a satisfied consent gate, and at least one active tenant-approved path.

For buyer destinations, the engine also requires an active buyer, an active buyer-program relationship, available applicable capacity, and any configured geography rule. The original buyer and previously attempted buyers are excluded. Ranking is deterministic and explained with operational facts; it is not an AI score.

Compliance, consent, suppression, and invalid-contact categories are blocked by default. Unknown categories require manual review. These defaults are conservative application behavior, not legal advice.

## State and audit model

- `recovery_policies`: tenant eligibility and safety limits
- `recovery_paths`: tenant-approved buyer, host-post, link-out, offer-wall, or manual-review destinations
- `lead_recoveries`: one recovery workflow tied to the exact originating rejection
- `recovery_attempts`: ordered, idempotent attempts linked to trusted delivery attempts when executed
- `recovery_reviews`: authorized manual decisions
- `recovery_events`: append-only, PII-safe journey events for authenticated application users

The originating rejection and primary delivery attempts are never overwritten. Unique tenant idempotency keys prevent duplicate workflows and transaction keys prevent duplicate attempts. The approval RPC locks the workflow row and treats repeated queued, blocked, or terminal decisions idempotently.

## Security and privacy

RLS is authoritative. Active tenant members may read recovery operations. Only tenant administrators and managers may configure or decide recovery. The client permission map mirrors this behavior for usability.

Recovery records contain operational IDs, status, timing, safe reason codes, and economic values. They must not contain lead identity, raw request/response bodies, tokens, credentials, or URLs containing lead data. Consent evidence is represented by status, scope, version, and confirmation time; raw consent artifacts remain outside this model.

## Trusted execution integration point

`axis_decide_recovery` records approval and changes an eligible workflow to `queued`. A future trusted server-side worker may consume queued rows, re-check policy and consent, execute through an approved integration, create the canonical `lead_delivery_attempts` row, then append a linked `recovery_attempts` result. Browser code must never hold destination credentials or execute outbound delivery.
