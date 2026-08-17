import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const migration=readFileSync(new URL('../../supabase/migrations/202608160007_release_5_recover.sql',import.meta.url),'utf8').toLowerCase()

describe('Release 5 database contract',()=>{
  it('creates the six canonical recovery tables',()=>{for(const table of ['recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews','recovery_events'])expect(migration).toContain(`create table public.${table}`)})
  it('enables RLS for every recovery table',()=>{expect(migration).toContain("alter table public.%i enable row level security");for(const table of ['recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews','recovery_events'])expect(migration).toContain(`'${table}'`)})
  it('uses member read and manager write authorization',()=>{expect(migration).toContain('axis_is_tenant_member(tenant_id)');expect(migration).toContain("array[''tenant_admin'',''manager'']")})
  it('enforces tenant-consistent foreign relationships',()=>{expect(migration).toContain('axis_enforce_r5_tenant_fk');for(const target of ['recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews','recovery_events'])expect(migration).toContain(`'${target}'`)})
  it('provides recovery and attempt idempotency constraints',()=>{expect(migration).toContain('unique(tenant_id,idempotency_key)');expect(migration).toContain('unique(tenant_id,transaction_key)');expect(migration).toContain('one_active_recovery_per_rejection')})
  it('defaults execution to approval-required',()=>expect(migration).toContain("execution_mode text not null default 'approval_required'"))
  it('keeps decision execution security invoker and role checked',()=>{expect(migration).toContain('axis_decide_recovery');expect(migration).toContain('security invoker');expect(migration).toContain('axis_has_tenant_role(p_tenant_id')})
  it('queues approval without performing outbound delivery',()=>{expect(migration).toContain("when 'approve' then 'queued'");expect(migration).not.toMatch(/http_post|net\.http|pg_net|webhook_request/)})
  it('blocks unsafe destination query strings',()=>expect(migration).toContain("position('?' in destination_reference)=0"))
  it('adds audit triggers using the repaired generic audit function',()=>{expect(migration).toContain('axis_capture_audit_event()');expect(migration).toContain('create trigger audit_%i')})
  it('keeps recovery events append-only for authenticated users',()=>expect(migration).not.toMatch(/grant update,delete[^;]*recovery_events/))
  it('exposes only a tenant-authorized intelligence snapshot',()=>{expect(migration).toContain('axis_recovery_intelligence_snapshot');expect(migration).toContain('axis_is_tenant_member(p_tenant_id)')})
  it('never disables RLS or grants browser service-role privileges',()=>{expect(migration).not.toContain('disable row level security');expect(migration).not.toContain('service_role');expect(migration).not.toContain('to anon')})
})
