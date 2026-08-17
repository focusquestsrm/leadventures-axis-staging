import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const migration=readFileSync(new URL('../../supabase/migrations/202608160008_fix_outcome_intelligence_aggregates.sql',import.meta.url),'utf8').toLowerCase()

describe('outcome intelligence aggregate repair',()=>{
  it('replaces the existing outcome intelligence RPC forward-only',()=>expect(migration).toContain('create or replace function public.axis_outcome_intelligence_snapshot'))
  it('aggregates source JSON over pre-grouped source rows',()=>{expect(migration).toContain('source_rows');expect(migration).toContain('group by l.traffic_source_id,l.campaign_id')})
  it('aggregates buyer JSON over pre-grouped buyer rows',()=>{expect(migration).toContain('buyer_rows');expect(migration).toContain('group by b.id')})
  it('aggregates program JSON over pre-grouped program rows',()=>{expect(migration).toContain('program_rows');expect(migration).toContain('group by p.id')})
  it('preserves invoker security and tenant authorization',()=>{expect(migration).toContain('security invoker');expect(migration).toContain('axis_is_tenant_member(p_tenant_id)')})
  it('does not expose identity fields or broaden grants',()=>{expect(migration).not.toMatch(/lead_identity|email|phone|first_name|last_name|service_role|to anon/);expect(migration).toContain('to authenticated')})
})
