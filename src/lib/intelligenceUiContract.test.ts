import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pages = readFileSync(new URL('../intelligencePages.tsx',import.meta.url),'utf8')
const app = readFileSync(new URL('../App.tsx',import.meta.url),'utf8')
const styles = readFileSync(new URL('../styles.css',import.meta.url),'utf8')

describe('Release 3 intelligence UI contract', () => {
  it('routes every required intelligence workspace', () => { for (const route of ['/acquire','/convert','/route','/recover','/optimize','/intelligence/buyers','/intelligence/programs','/intelligence/rejections']) expect(app).toContain(`path="${route}"`) })
  it('provides every required global filter', () => { expect(pages).toContain('<label>Date range'); for (const label of ['Source','Campaign','Buyer','Program','Offer','Lead status']) expect(pages).toContain(`label="${label}"`) })
  it('provides all required date presets including custom', () => { for (const label of ['Today','Yesterday','Last 7 Days','Last 30 Days','This Month','Last Month','Custom']) expect(pages).toContain(`label: '${label}'`) })
  it('keeps financial values unavailable when no authoritative data exists', () => { expect(pages).toContain("if (value == null) return 'Unavailable'"); expect(pages).toContain('Closed-loop value is attributed only through matched outcome records') })
  it('includes responsive dashboard and filter breakpoints', () => { expect(styles).toContain('@media(max-width:900px)'); expect(styles).toContain('@media(max-width:600px)'); expect(styles).toContain('@media(max-width:390px)'); expect(styles).toContain('.intelligence-layout{grid-template-columns:1fr}') })
  it('uses the approved light enterprise surface tokens', () => { expect(styles).toContain('background:var(--axis-surface-gloss)'); expect(styles).not.toMatch(/\.intelligence-[^{]*\{[^}]*background:\s*#(?:1|2)[0-9a-f]{5}/i) })
})
