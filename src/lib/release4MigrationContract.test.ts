import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration=readFileSync(new URL('../../supabase/migrations/202608160006_release_4_integrations_outcomes.sql',import.meta.url),'utf8').toLowerCase()

describe('Release 4 database contract', () => {
  it('adds every canonical integration operations table', () => { for(const table of ['integration_field_mappings','integration_import_batches','integration_import_errors','integration_sync_runs','outcome_mappings','lead_outcomes']) expect(migration).toContain(`create table public.${table}`) })
  it('enables RLS on every new table through the audited table list', () => { expect(migration).toContain("execute format('alter table public.%i enable row level security'"); for(const table of ['integration_field_mappings','integration_import_batches','integration_import_errors','integration_sync_runs','outcome_mappings','lead_outcomes']) expect(migration).toContain(`'${table}'`) })
  it('uses tenant membership for reads and manager authorization for writes', () => { expect(migration).toContain('axis_is_tenant_member(tenant_id)'); expect(migration).toContain("axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']") })
  it('enforces tenant-consistent foreign keys on every R4 record type', () => { expect(migration).toContain('axis_enforce_r4_tenant_fk'); expect(migration).toContain("'lead_outcomes','lead_delivery_attempts'"); expect(migration).toContain('create trigger r4_%i_tenant_fk') })
  it('uses an integration-scoped idempotency key', () => expect(migration).toContain('on public.lead_delivery_attempts(tenant_id,integration_id,external_reference)'))
  it('keeps finalization security invoker and validates caller authorization', () => { expect(migration).toContain('axis_finalize_leadhoop_import'); expect(migration).toContain('security invoker'); expect(migration).toContain('axis_has_tenant_role(p_tenant_id') })
  it('caps trusted finalization batch size', () => expect(migration).toContain('jsonb_array_length(p_rows)>10000'))
  it('does not persist raw upload rows or identity fields', () => { expect(migration).not.toMatch(/raw_(row|payload|csv)/); expect(migration).not.toMatch(/\b(email|phone|first_name|last_name|address)\b/) })
  it('records safe issue codes rather than submitted row contents', () => { expect(migration).toContain("'normalized row failed validation; inspect the configured mapping.'"); expect(migration).toContain("v_issue->>'code'") })
  it('adds audit triggers to mutable integration and outcome tables', () => { expect(migration).toContain('create trigger audit_%i after insert or update or delete on public.%i'); expect(migration).toContain("'outcome_mappings','lead_outcomes'") })
  it('provides a read-only tenant-scoped outcome intelligence RPC', () => { expect(migration).toContain('axis_outcome_intelligence_snapshot'); expect(migration).toContain('axis_is_tenant_member(p_tenant_id)') })
  it('grants RPC execution only to authenticated users', () => { expect(migration).toContain('to authenticated'); expect(migration).not.toContain('to anon') })
  it('never disables RLS or grants service-role behavior to the browser', () => { expect(migration).not.toContain('disable row level security'); expect(migration).not.toContain('service_role') })
})
