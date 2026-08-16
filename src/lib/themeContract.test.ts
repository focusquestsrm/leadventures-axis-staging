import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const theme = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').toLowerCase()

describe('Axis master theme contract', () => {
  it.each([
    '--axis-background:#f5f7f8',
    '--axis-background-subtle:#fafbfc',
    '--axis-surface:#ffffff',
    '--axis-surface-secondary:#f1f3f5',
    '--axis-surface-elevated:#ffffff',
    '--axis-border:#e1e5e8',
    '--axis-border-strong:#cdd3d8',
    '--axis-text-primary:#1a1d20',
    '--axis-text-secondary:#525a61',
    '--axis-text-muted:#7b858d',
    '--axis-charcoal:#22272b',
    '--axis-charcoal-soft:#343a40',
    '--axis-accent:#ef663f',
  ])('defines the centralized token %s', (token) => {
    expect(theme).toContain(token)
  })

  it('keeps warm neutral values out of the master palette', () => {
    expect(theme).not.toMatch(/#58453f|#3b332f|#f3f2ef|#fbfaf8/)
  })

  it('applies the premium-light theme after the legacy dark overrides', () => {
    const lightTheme = theme.lastIndexOf('axis premium-light master theme')
    const darkTheme = theme.lastIndexOf('axis cool-charcoal master theme')

    expect(lightTheme).toBeGreaterThan(darkTheme)
    expect(theme.slice(lightTheme)).toContain('background:var(--axis-background)')
    expect(theme.slice(lightTheme)).toContain('background:var(--axis-surface)')
  })

  it('keeps tenant names out of the master theme', () => {
    expect(theme).not.toMatch(/focusquest|back2learn|axis demo/)
  })
})
