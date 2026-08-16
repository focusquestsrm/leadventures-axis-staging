export type Role = 'platform_admin' | 'tenant_admin' | 'manager' | 'media_buyer' | 'analyst' | 'viewer'
export type TenantRole = Exclude<Role, 'platform_admin'>
export type Permission =
  | 'tenant:read' | 'tenant:manage' | 'membership:read' | 'membership:manage'
  | 'lead:read' | 'lead:write' | 'lead:identity:read'
  | 'buyer:read' | 'buyer:write' | 'offer:read' | 'offer:write'
  | 'integration:read' | 'integration:manage' | 'audit:read' | 'platform:manage'

export interface Tenant { id: string; name: string; slug: string; status: 'active' | 'inactive' | 'suspended'; plan: string; createdAt: string }
export interface Membership { id: string; tenantId: string; userId: string; name: string; email: string; role: TenantRole; status: 'active' | 'invited' | 'disabled' }
export interface Program { id: string; tenantId: string; name: string; code: string; category: string; status: 'active' | 'draft' | 'paused' }
export interface Lead { id: string; tenantId: string; reference: string; programId: string | null; program: string; source: string; status: 'new' | 'qualified' | 'processing' | 'rejected'; score: number; createdAt: string }
export interface Buyer { id: string; tenantId: string; name: string; externalReference: string; notes: string; status: 'active' | 'paused'; offers: number; updatedAt: string }
export interface Offer { id: string; tenantId: string; name: string; programId: string | null; program: string; status: 'active' | 'draft' | 'paused'; buyerCount: number }
export interface Integration { id: string; tenantId: string; name: string; kind: string; status: 'connected' | 'needs_attention' | 'not_configured'; updatedAt: string }
export interface TenantSetting { id: string; tenantId: string; key: string; value: string }
export interface AuditEvent { id: string; tenantId: string | null; actor: string; eventType: string; entityType: string; entityId: string; occurredAt: string }
export interface SessionUser { id: string; name: string; email: string; isPlatformAdmin: boolean }
