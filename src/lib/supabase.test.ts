import { describe, expect, it } from 'vitest'
import { isDemoModeEnabled } from './supabase'

describe('demo mode guard', () => {
  it('can run in development when not explicitly disabled', () => {
    expect(isDemoModeEnabled(true, 'true')).toBe(true)
  })

  it('cannot activate in production builds', () => {
    expect(isDemoModeEnabled(false, 'true')).toBe(false)
  })
})
