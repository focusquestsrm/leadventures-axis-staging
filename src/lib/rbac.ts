import type { Permission, Role, TenantRole } from '../types'

const grants: Record<Role, readonly Permission[]> = {
  platform_admin: ['tenant:read', 'tenant:manage', 'membership:read', 'membership:manage', 'lead:read', 'lead:write', 'lead:identity:read', 'buyer:read', 'buyer:write', 'offer:read', 'offer:write', 'source:read', 'source:write', 'delivery:read', 'delivery:write', 'capacity:read', 'capacity:write', 'integration:read', 'integration:manage', 'recovery:read', 'recovery:manage', 'recovery:approve', 'optimization:read', 'optimization:manage', 'optimization:approve', 'optimization:implement', 'acquisition:read', 'acquisition:manage', 'acquisition:sync', 'experiment:manage', 'automation:read', 'automation:configure', 'automation:approve', 'automation:execute', 'automation:rollback', 'automation:emergency_stop', 'audit:read', 'platform:manage'],
  tenant_admin: ['tenant:read', 'tenant:manage', 'membership:read', 'membership:manage', 'lead:read', 'lead:write', 'lead:identity:read', 'buyer:read', 'buyer:write', 'offer:read', 'offer:write', 'source:read', 'source:write', 'delivery:read', 'delivery:write', 'capacity:read', 'capacity:write', 'integration:read', 'integration:manage', 'recovery:read', 'recovery:manage', 'recovery:approve', 'optimization:read', 'optimization:manage', 'optimization:approve', 'optimization:implement', 'acquisition:read', 'acquisition:manage', 'acquisition:sync', 'experiment:manage', 'automation:read', 'automation:configure', 'automation:approve', 'automation:execute', 'automation:rollback', 'automation:emergency_stop', 'audit:read'],
  manager: ['tenant:read', 'membership:read', 'lead:read', 'lead:write', 'lead:identity:read', 'buyer:read', 'buyer:write', 'offer:read', 'offer:write', 'source:read', 'source:write', 'delivery:read', 'delivery:write', 'capacity:read', 'capacity:write', 'integration:read', 'recovery:read', 'recovery:manage', 'recovery:approve', 'optimization:read', 'optimization:manage', 'optimization:approve', 'optimization:implement', 'acquisition:read', 'acquisition:manage', 'acquisition:sync', 'experiment:manage', 'automation:read', 'automation:approve', 'automation:execute', 'automation:rollback', 'audit:read'],
  media_buyer: ['tenant:read', 'lead:read', 'buyer:read', 'offer:read', 'source:read', 'source:write', 'delivery:read', 'capacity:read', 'integration:read', 'recovery:read', 'optimization:read', 'optimization:implement', 'acquisition:read', 'acquisition:manage', 'acquisition:sync', 'experiment:manage', 'automation:read', 'automation:approve', 'automation:execute'],
  analyst: ['tenant:read', 'lead:read', 'buyer:read', 'offer:read', 'source:read', 'delivery:read', 'capacity:read', 'integration:read', 'recovery:read', 'optimization:read', 'acquisition:read', 'automation:read', 'audit:read'],
  viewer: ['tenant:read', 'lead:read', 'buyer:read', 'offer:read', 'source:read', 'delivery:read', 'capacity:read', 'integration:read', 'recovery:read', 'optimization:read', 'acquisition:read', 'automation:read'],
}

export const can = (role: Role | undefined, permission: Permission, isPlatformAdmin = false) =>
  (isPlatformAdmin && permission !== 'lead:identity:read') || (role ? grants[role].includes(permission) : false)

export const tenantAssignableRoles: readonly TenantRole[] = ['tenant_admin', 'manager', 'media_buyer', 'analyst', 'viewer']

export const isTenantAssignableRole = (value: string): value is TenantRole => tenantAssignableRoles.includes(value as TenantRole)

export const roleLabel = (role: Role) => role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
