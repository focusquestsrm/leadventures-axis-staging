import { describe, expect, it } from 'vitest'
import { auditEventSelect, membershipSelect } from './queryContracts'

describe('PostgREST relationship contracts', () => {
  it('embeds a membership display profile through user_id', () => {
    expect(membershipSelect).toContain('profiles!tenant_memberships_user_id_fkey(display_name)')
    expect(membershipSelect).not.toMatch(/(^|,)profiles\(display_name\)/)
    expect(membershipSelect).not.toContain('tenant_memberships_created_by_fkey')
  })

  it('embeds an audit actor through actor_user_id', () => {
    expect(auditEventSelect).toContain('profiles!audit_events_actor_user_id_fkey(display_name)')
    expect(auditEventSelect).not.toMatch(/(^|,)profiles\(display_name\)/)
  })
})
