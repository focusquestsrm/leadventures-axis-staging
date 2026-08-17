import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('Release 7 Acquire UI contract', () => {
  it('keeps the acquisition funnel inside its panel at every breakpoint', () => {
    expect(styles).toContain('.acquire-layout>*{min-width:0}')
    expect(styles).toContain('.acquire-funnel{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))')
    expect(styles).toContain('.acquire-funnel div{position:relative;min-width:0')
    expect(styles).toContain('.acquire-funnel{grid-template-columns:repeat(3,minmax(0,1fr))}')
    expect(styles).toContain('.acquire-funnel{grid-template-columns:repeat(2,minmax(0,1fr))}')
  })
})
