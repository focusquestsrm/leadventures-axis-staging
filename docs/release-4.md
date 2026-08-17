# Release 4: Integrations and closed-loop outcomes

Release 4 connects the operational lead lifecycle to external delivery and CRM outcomes through a tenant-scoped canonical integration layer. It adds an integrations operations hub, a safe LeadHoop-style CSV workflow, explicit CRM outcome mapping, deterministic reconciliation, data lineage, and closed-loop intelligence.

## Delivered

- Reusable connector and adapter contracts under `src/integrations`
- Integration administration with configuration, mappings, imports, syncs, errors, reconciliation, and health
- Validate-before-import workflow with a 5 MB interactive limit and a documented background-processing boundary
- Tenant/integration-scoped mappings, batches, errors, sync runs, outcome mappings, and outcomes
- Exact-ID matching; ambiguous and unmatched records are never guessed
- Idempotency on tenant, integration, and external transaction/outcome identifiers
- CRM outcomes in lead journeys and source, buyer, program, and overview intelligence
- Synthetic LeadHoop and CRM demonstrations containing no customer PII

## Deployment

Apply `202608160006_release_4_integrations_outcomes.sql` to staging after migrations 001-005. Run `supabase/tests/release_4_security.sql` against a disposable/local database or in a transactional staging test session. Provision connector secrets only through a trusted server or Supabase Edge Function backed by a secrets manager.

Interactive file preview is intentionally capped. Production-scale retries, queues, webhook endpoints, and vendor credential provisioning remain server infrastructure work; the schema and adapter boundaries are designed for those additions without moving secrets or unrestricted payloads into the browser.
