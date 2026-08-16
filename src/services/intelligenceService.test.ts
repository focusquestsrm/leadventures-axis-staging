import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./intelligenceService.ts',import.meta.url),'utf8')

describe('intelligence service query contract', () => {
  it('uses the tenant-authorized database aggregation RPC in connected mode', () => { expect(source).toContain("rpc('axis_intelligence_snapshot'"); expect(source).toContain('p_tenant_id: input.tenantId') })
  it('passes every global filter to the centralized service', () => { for (const filter of ['traffic_source_id','campaign_id','buyer_id','program_id','offer_id','lead_status']) expect(source).toContain(filter) })
  it('does not query or return identity fields', () => expect(source).not.toMatch(/lead_identity|first_name|last_name|email|phone|address/i))
})
