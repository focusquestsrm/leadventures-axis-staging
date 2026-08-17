# Integration architecture

Axis uses this flow: integration definition → adapter → validation/import or sync → canonical model → deterministic matching → operational/outcome records → intelligence.

Integration categories are `lead_distribution`, `crm`, `media`, `webhook`, `file_import`, `api`, `data_warehouse`, and `other`. Vendor logic belongs in an adapter, never in a React page. React calls `integrationService`; that service returns tenant- and integration-scoped workspaces and invokes trusted database functions.

## Operational records

- `integration_field_mappings`: external-to-canonical field definitions
- `integration_import_batches`: file-level counts and status
- `integration_import_errors`: PII-free codes and safe messages
- `integration_sync_runs`: created, updated, skipped, errored, and duration telemetry
- `outcome_mappings`: explicit external status taxonomy
- `lead_outcomes`: matched downstream events and economic value

Every record carries tenant and integration lineage where applicable. Delivery attempts additionally carry `integration_id`, `import_batch_id`, `source_system`, and `ingested_at`.

## Webhook and credential boundary

Future inbound webhooks must terminate in a trusted server/Edge Function that resolves tenant and integration from a non-secret route identifier, authenticates a signature, validates the schema, enforces an idempotency key, normalizes through the connector, and records only safe telemetry. No unauthenticated browser-facing ingestion endpoint is provided.

API keys, refresh tokens, client secrets, signing secrets, and service-role credentials belong in a server-side secrets manager. `integrations.config_reference` may identify a secret; the secret value must never enter an ordinary table, VITE variable, browser bundle, URL, log, or audit event.

## Idempotency and batching

Delivery attempts use a partial unique index on `(tenant_id, integration_id, external_reference)`. Outcomes use `(tenant_id, integration_id, external_outcome_id)`. A repeated transaction is skipped, not duplicated. Interactive imports accept at most 5 MB and finalization accepts at most 10,000 normalized rows. Larger jobs should upload to protected object storage and use paginated background workers with retry checkpoints.
