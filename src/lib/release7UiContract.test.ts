import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'
const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');const pages=readFileSync(new URL('../acquirePages.tsx',import.meta.url),'utf8');const service=readFileSync(new URL('../services/acquisitionService.ts',import.meta.url),'utf8');const domain=readFileSync(new URL('./acquisition.ts',import.meta.url),'utf8');const types=readFileSync(new URL('../types.ts',import.meta.url),'utf8')
describe('Release 7 UI and service contract',()=>{
 it('routes all primary acquisition workspaces',()=>{for(const route of ['/acquire/sources','/acquire/campaigns/:campaignId','/acquire/ad-groups/:adGroupId','/acquire/creatives/:creativeId','/acquire/experiments','/media-import','/integrations/media/:accountId'])expect(app).toContain(route)})
 it('labels platform and downstream conversions separately',()=>{expect(pages).toContain('Platform activity and Axis outcomes remain explicitly distinct');expect(types).toContain('platformConversions');expect(types).toContain('downstreamConversions')})
 it('shows economic and capacity context',()=>{for(const text of ['Cheap leads vs. valuable leads','Contribution / Lead','Capacity-aware acquisition warning','Recovered Revenue'])expect(pages).toContain(text)})
 it('connects acquisition to Convert and Optimize',()=>{expect(app).toContain('ConvertAcquisitionPanel');expect(app).toContain('OptimizeAcquisitionPanel')})
 it('provides media account navigation and trusted import finalization',()=>{expect(pages).toContain('/integrations/media/');expect(pages).toContain('acquisitionService.finalizeImport');expect(pages).toContain('Import validated rows')})
 it('queries every live acquisition table by active tenant',()=>expect(service.match(/\.eq\('tenant_id',tenantId\)/g)?.length).toBeGreaterThanOrEqual(11))
 it('does not query identity or expose credential fields',()=>expect(`${pages}${service}`).not.toMatch(/lead_identity|access_token|refresh_token|client_secret|\.select\([^)]*(email|phone|first_name|last_name)/i))
 it('states that media actions remain human controlled',()=>expect(`${pages}${domain}`).toContain('no budget or media change will occur automatically'))
})
