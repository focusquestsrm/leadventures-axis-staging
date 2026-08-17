# Tenant Isolation Certification

## Scope and method

The transactional SQL suites create synthetic Alpha and Beta tenants and authenticated users, switch JWT subjects, exercise RLS reads/writes and roll back. Coverage spans direct records, relationships, aggregate intelligence, recommendations, recovery, acquisition/media, integrations/imports/outcomes, automation, notifications and audits.

## Code evidence

- Connected browser queries include explicit `tenant_id` predicates; database RLS is final authority.
- Cross-tenant foreign-key trigger guards validate polymorphic and ordinary relationships.
- Aggregate RPCs derive tenant context from authorized input and do not expose identity fields.
- Platform administrators are not implicitly granted lead identity access.

## Certification procedure

1. Run `supabase/tests/release_1_security.sql` through `release_8_security.sql` against a migration-current staging clone.
2. Confirm every transaction rolls back and reports no exception.
3. As Tenant A, attempt Tenant B direct reads, filters, drill-downs, recommendations, actions, integrations, imports, outcomes, recovery, acquisition/media, notifications and audits.
4. Capture timestamp, project reference, migration versions, tester and results without row content or PII.

Status: code evidence passes; connected-staging execution evidence remains required for Release 9 certification.
