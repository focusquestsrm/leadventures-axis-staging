import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'
const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8');const pages=readFileSync(new URL('../optimizePages.tsx',import.meta.url),'utf8');const shell=readFileSync(new URL('../components/Shell.tsx',import.meta.url),'utf8');const service=readFileSync(new URL('../services/optimizationService.ts',import.meta.url),'utf8');const rules=readFileSync(new URL('./recommendationRules.ts',import.meta.url),'utf8')
describe('Release 6 UI and client safety contract',()=>{
  it('routes every optimization workspace',()=>{for(const route of ['/optimize"','/optimize/brief','/optimize/recommendations','/optimize/recommendations/:recommendationId','/optimize/forecasts','/optimize/pacing','/optimize/anomalies'])expect(app).toContain(route)})
  it('shows confidence, sample size, freshness, evidence, and impact',()=>{for(const label of ['Confidence','Sample size','Freshness','Evidence','Estimated impact'])expect(pages).toContain(label)})
  it('keeps decisions capability-gated',()=>{expect(pages).toContain("allowed('optimization:approve')");expect(pages).toContain("allowed('optimization:implement')")})
  it('states that estimates are not guarantees',()=>expect(pages).toContain('Estimates are not guarantees'))
  it('uses a deterministic provider and inactive future AI boundary',()=>{expect(rules).toContain('DeterministicRecommendationProvider');expect(rules).toContain('FutureAIRecommendationProvider');expect(rules).toContain('No external AI provider is configured')})
  it('queries all optimization data by active tenant',()=>expect(service.match(/\.eq\('tenant_id',tenantId\)/g)?.length).toBeGreaterThanOrEqual(7))
  it('does not query lead identity or embed tenant brands',()=>expect(`${pages}${service}${rules}`).not.toMatch(/lead_identity|focusquest|back2learn|axis demo|\.select\([^)]*(email|phone|first_name|last_name)/i))
  it('removes internal release labels from customer page headers',()=>expect(shell).toContain('customerEyebrow'))
})
