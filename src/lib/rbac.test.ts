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
})
