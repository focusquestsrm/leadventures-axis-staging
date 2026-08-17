import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8')
const pages=readFileSync(new URL('../integrationPages.tsx',import.meta.url),'utf8')
const intelligence=readFileSync(new URL('../intelligencePages.tsx',import.meta.url),'utf8')
const leadJourney=readFileSync(new URL('../release2Pages.tsx',import.meta.url),'utf8')
const service=readFileSync(new URL('../services/integrationService.ts',import.meta.url),'utf8')

describe('Release 4 UI and client security contract', () => {
  it('routes the hub, detail, and safe import workflow', () => { for(const route of ['/integrations"','/integrations/:integrationId','/integrations/:integrationId/import']) expect(app).toContain(route) })
  it('exposes all required integration operations tabs', () => { for(const tab of ['configuration','field mapping','import history','sync history','errors','reconciliation','health']) expect(pages).toContain(`'${tab}'`) })
  it('warns that credentials are server-side and provides no secret input', () => { expect(pages).toContain('Credentials stay server-side'); expect(pages).not.toMatch(/type=["']password/) })
  it('provides preview, cancel, and explicit finalization controls', () => { expect(pages).toContain('Validated preview'); expect(pages).toContain('Cancel'); expect(pages).toContain('Import validated rows') })
  it('enforces the interactive upload size boundary', () => { expect(service).toContain('5_000_000'); expect(pages).toContain('5_000_000') })
  it('sends only an allowlisted normalized payload to finalization', () => { expect(service).toContain('const safeRows='); expect(service).not.toMatch(/email|phone|auth token|jwt/i) })
  it('shows downstream outcomes on intelligence surfaces', () => { for(const label of ['Closed-loop outcome funnel','Outcome Revenue','Revenue / Lead','Conversions']) expect(intelligence).toContain(label) })
  it('adds external CRM and economic events to the lead journey', () => { expect(leadJourney).toContain('data.leadOutcomes'); expect(leadJourney).toContain("kind:'outcome'"); expect(leadJourney).toContain('timeline-${event.kind}') })
  it('does not hard-code tenant or customer brands into integration logic', () => expect(`${pages}${service}`).not.toMatch(/focusquest|back2learn|axis demo/i))
})
