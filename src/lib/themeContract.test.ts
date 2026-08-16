import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const theme = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').toLowerCase()

describe('Axis master theme contract', () => {
  it.each([
    '--axis-black:#111315',
    '--axis-charcoal:#1b1e21',
    '--axis-graphite:#25292d',
    '--axis-surface:#2d3135',
    '--axis-surface-elevated:#353a3f',
    '--axis-border:#454b51',
    '--axis-text-primary:#f5f7f8',
    '--axis-text-secondary:#b8c0c7',
    '--axis-text-muted:#858e96',
    '--axis-accent:#ef663f',
  ])('defines the centralized token %s', (token) => {
    expect(theme).toContain(token)
  })

  it('does not retain the warm neutral values that caused the brown cast', () => {
    expect(theme).not.toMatch(/#58453f|#3b332f|#f3f2ef|#fbfaf8/)
  })

  it('keeps tenant names out of the master theme', () => {
    expect(theme).not.toMatch(/focusquest|back2learn|axis demo/)
  })
})
