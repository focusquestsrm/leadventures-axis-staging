import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202608160005_release_3_intelligence.sql', import.meta.url),'utf8').toLowerCase()

describe('Release 3 database intelligence contract', () => {
  it('exposes one read-only tenant-scoped aggregation RPC', () => { expect(migration).toContain('axis_intelligence_snapshot'); expect(migration).toContain('security invoker'); expect(migration).toContain('axis_is_tenant_member(p_tenant_id)') })
  it('does not access the lead identity or profile tables', () => { expect(migration).not.toContain('lead_identity'); expect(migration).not.toMatch(/from public\.profiles/) })
  it('does not weaken or disable RLS', () => { expect(migration).not.toContain('disable row level security'); expect(migration).not.toContain('security definer\nset search_path=public\nas $$') })
  it('grants execution only to authenticated users', () => { expect(migration).toContain('grant execute on function public.axis_intelligence_snapshot'); expect(migration).toContain('to authenticated'); expect(migration).not.toContain('to anon') })
  it('contains database-side grouped metrics and supporting indexes', () => { for (const value of ['acceptancerate','rejectionrate','recoveryopportunity','averageresponsems','timeoutrate','capacityutilization','group by received_at::date','intelligence_idx']) expect(migration).toContain(value) })
  it('uses a non-keyword alias for the daily trend dimension', () => { expect(migration).toContain('received_at::date as trend_day'); expect(migration).toContain("'label',t.trend_day"); expect(migration).not.toContain('received_at::date day') })
  it('keeps viewer access read only because the RPC contains no DML', () => expect(migration).not.toMatch(/\b(insert|update|delete|merge|truncate)\b/))
})
