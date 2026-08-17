import { describe, expect, it } from 'vitest'
import { can, isTenantAssignableRole } from './rbac'

describe('centralized permissions', () => {
  it('keeps viewers read-only', () => {
    expect(can('viewer', 'lead:read')).toBe(true)
    expect(can('viewer', 'lead:write')).toBe(false)
    expect(can('viewer', 'tenant:manage')).toBe(false)
  })

  it('allows tenant admins to manage only tenant capabilities', () => {
    expect(can('tenant_admin', 'membership:manage')).toBe(true)
    expect(can('tenant_admin', 'platform:manage')).toBe(false)
  })

  it('gives a platform administrator platform access independent of membership role', () => {
    expect(can(undefined, 'platform:manage', true)).toBe(true)
  })

  it('does not implicitly grant platform administrators lead identity access', () => {
    expect(can(undefined, 'lead:identity:read', true)).toBe(false)
    expect(can('tenant_admin', 'lead:identity:read', true)).toBe(true)
  })

  it('never permits platform_admin as a tenant membership role', () => {
    expect(isTenantAssignableRole('platform_admin')).toBe(false)
    expect(isTenantAssignableRole('manager')).toBe(true)
  })

  it('keeps viewers read-only across Release 2 capabilities', () => {
    expect(can('viewer', 'delivery:read')).toBe(true)
    expect(can('viewer', 'delivery:write')).toBe(false)
    expect(can('viewer', 'capacity:write')).toBe(false)
    expect(can('viewer', 'source:write')).toBe(false)
  })

  it('allows tenant admins to manage Release 2 resources and media buyers to manage acquisition registries only', () => {
    expect(can('tenant_admin', 'delivery:write')).toBe(true)
    expect(can('tenant_admin', 'capacity:write')).toBe(true)
    expect(can('media_buyer', 'source:write')).toBe(true)
    expect(can('media_buyer', 'delivery:write')).toBe(false)
  })

  it('keeps Release 5 recovery decisions capability-gated', () => {
    expect(can('viewer', 'recovery:read')).toBe(true)
    expect(can('viewer', 'recovery:approve')).toBe(false)
    expect(can('analyst', 'recovery:manage')).toBe(false)
    expect(can('media_buyer', 'recovery:approve')).toBe(false)
    expect(can('manager', 'recovery:approve')).toBe(true)
    expect(can('tenant_admin', 'recovery:manage')).toBe(true)
  })

  it('keeps optimization approval centralized and human-controlled', () => {
    expect(can('viewer', 'optimization:read')).toBe(true)
    expect(can('viewer', 'optimization:approve')).toBe(false)
    expect(can('analyst', 'optimization:approve')).toBe(false)
    expect(can('media_buyer', 'optimization:implement')).toBe(true)
    expect(can('media_buyer', 'optimization:approve')).toBe(false)
    expect(can('manager', 'optimization:approve')).toBe(true)
    expect(can('tenant_admin', 'optimization:manage')).toBe(true)
  })
})
