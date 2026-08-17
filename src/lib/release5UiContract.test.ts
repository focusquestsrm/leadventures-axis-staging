import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8')
const pages=readFileSync(new URL('../recoveryPages.tsx',import.meta.url),'utf8')
const adminPages=readFileSync(new URL('../recoveryAdminPages.tsx',import.meta.url),'utf8')
const service=readFileSync(new URL('../services/recoveryService.ts',import.meta.url),'utf8')
const journey=readFileSync(new URL('../release2Pages.tsx',import.meta.url),'utf8')
const intelligence=readFileSync(new URL('../intelligencePages.tsx',import.meta.url),'utf8')

describe('Release 5 UI and client security contract',()=>{
  it('routes dashboard, policies, path creation, reviews, and recovery detail',()=>{for(const route of ['/recover"','/recover/policies','/recover/paths/new','/recover/reviews','/recover/:recoveryId'])expect(app).toContain(route)})
  it('shows all required recovery KPI labels',()=>{for(const label of ['Rejected Leads','Recoverable Leads','Recovery Attempts','Recovered Leads','Recovery Rate','Recovered Revenue','Average Recovery Value','Exhausted / Blocked'])expect(pages).toContain(label)})
  it('keeps approval capability-gated',()=>expect(pages).toContain("allowed('recovery:approve')"))
  it('states explicitly that approval does not execute delivery',()=>expect(pages).toContain('Approval queues an approved path'))
  it('provides policy creation, approved path inventory, and path creation',()=>{expect(pages).toContain('Create recovery policy');expect(pages).toContain('Approved recovery paths');expect(adminPages).toContain('Create approved path');expect(service).toContain('savePath')})
  it('separates recovery from the primary lead journey',()=>{expect(journey).toContain('RecoveryJourneyPanel');expect(pages).toContain('visually separated from primary delivery')})
  it('adds buyer and program recovery performance',()=>{expect(intelligence).toContain('BuyerRecoveryPerformance');expect(intelligence).toContain('ProgramRecoveryPerformance')})
  it('queries only tenant-scoped recovery workspaces',()=>{expect(service.match(/\.eq\('tenant_id',tenantId\)/g)?.length).toBeGreaterThanOrEqual(6)})
  it('does not embed tenant brands or identity fields in recovery logic',()=>expect(`${pages}${adminPages}${service}`).not.toMatch(/focusquest|back2learn|axis demo|\.select\([^)]*(email|phone|first_name|last_name)/i))
})
