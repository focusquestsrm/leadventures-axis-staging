import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../components/Shell.tsx', import.meta.url), 'utf8')
const pages = readFileSync(new URL('../automationPages.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const productPages = ['pages.tsx', 'release2Pages.tsx', 'intelligencePages.tsx', 'integrationPages.tsx', 'recoveryPages.tsx', 'acquirePages.tsx'].map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).join('\n')

describe('Release 8 Automation Center UI contract', () => {
  it('provides every control-center route', () => { for (const route of ['/automation', '/automation/approvals', '/automation/policies', '/automation/actions', '/automation/executions', '/automation/safeguards', '/automation/notifications', '/automation/settings']) expect(app).toContain(`path="${route}"`) })
  it('adds capability-controlled navigation', () => { expect(shell).toContain("allowed('automation:read')"); expect(shell).toContain('Automation Center') })
  it('shows executive status and all five engines', () => { for (const text of ['Automation Control Center', 'Awaiting Approval', 'Observed Value', "['acquire', 'convert', 'route', 'recover', 'optimize']"]) expect(pages).toContain(text) })
  it('shows action evidence, risk, freshness, approvals, and rollback', () => { for (const text of ['Execution preview', 'Why Axis proposed this', 'Data freshness', 'Approvals', 'Rollback', 'Expected impact']) expect(pages).toContain(text) })
  it('clearly distinguishes simulated execution', () => { expect(pages).toContain('SIMULATED'); expect(pages).toContain('No external account will be changed.') })
  it('includes destructive confirmations and the kill switch', () => { expect(pages).toContain('ConfirmDialog'); expect(pages).toContain('Disable all automation'); expect(pages).toContain("allowed('automation:emergency_stop')") })
  it('is responsive on desktop, tablet, and mobile', () => { expect(styles).toContain('@media(max-width:1200px)'); expect(styles).toContain('@media(max-width:820px)'); expect(styles).toContain('@media(max-width:560px)') })
  it('removes internal release labels from ordinary product pages', () => { expect(productPages).not.toMatch(/release\s+[1-8]/i) })
})
