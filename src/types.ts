export type Role = 'platform_admin' | 'tenant_admin' | 'manager' | 'media_buyer' | 'analyst' | 'viewer'
export type TenantRole = Exclude<Role, 'platform_admin'>
export type Permission =
  | 'tenant:read' | 'tenant:manage' | 'membership:read' | 'membership:manage'
  | 'lead:read' | 'lead:write' | 'lead:identity:read'
  | 'buyer:read' | 'buyer:write' | 'offer:read' | 'offer:write'
  | 'source:read' | 'source:write' | 'delivery:read' | 'delivery:write' | 'capacity:read' | 'capacity:write'
  | 'integration:read' | 'integration:manage' | 'audit:read' | 'platform:manage'

export type LeadStatus = 'new' | 'validated' | 'queued' | 'delivering' | 'accepted' | 'rejected' | 'recovered' | 'closed'
export type DeliveryStatus = 'pending' | 'accepted' | 'rejected' | 'timeout' | 'error' | 'cancelled'

export interface Tenant { id: string; name: string; slug: string; status: 'active' | 'inactive' | 'suspended'; plan: string; createdAt: string }
export interface Membership { id: string; tenantId: string; userId: string; name: string; email: string; role: TenantRole; status: 'active' | 'invited' | 'disabled' }
export interface Program { id: string; tenantId: string; name: string; code: string; category: string; status: 'active' | 'draft' | 'paused' }
export interface TrafficSource { id: string; tenantId: string; name: string; sourceType: string; externalId: string; status: 'active' | 'paused' | 'inactive'; notes: string }
export interface Campaign { id: string; tenantId: string; trafficSourceId: string | null; name: string; externalId: string; status: 'active' | 'paused' | 'draft'; campaignType: string; startDate: string | null; endDate: string | null }
export interface Lead { id: string; tenantId: string; reference: string; externalLeadId: string; trafficSourceId: string | null; campaignId: string | null; programId: string | null; offerId: string | null; program: string; source: string; campaign: string; offer: string; status: LeadStatus; score: number; receivedAt: string; createdAt: string }
export interface LeadIdentity { leadId: string; tenantId: string; displayName: string; email: string; phone: string; masked: boolean }
export interface Buyer { id: string; tenantId: string; name: string; externalReference: string; notes: string; status: 'active' | 'paused'; buyerType: string; deliveryMethod: string; defaultPayout: number; currency: string; duplicateWindowDays: number; exclusive: boolean; timezone: string; offers: number; updatedAt: string }
export interface Offer { id: string; tenantId: string; name: string; programId: string | null; program: string; status: 'active' | 'draft' | 'paused'; buyerCount: number }
export interface BuyerProgram { id: string; tenantId: string; buyerId: string; programId: string; status: 'active' | 'paused'; payout: number; priority: number }
export interface BuyerRule { id: string; tenantId: string; buyerId: string; ruleType: string; operator: string; value: string; status: 'active' | 'paused'; priority: number }
export interface BuyerCap { id: string; tenantId: string; buyerId: string; programId: string | null; capType: string; periodStart: string; periodEnd: string; limit: number; delivered: number; status: 'active' | 'paused' }
export interface LeadDelivery { id: string; tenantId: string; leadId: string; status: 'pending' | 'in_progress' | 'accepted' | 'exhausted' | 'cancelled' | 'error'; startedAt: string | null; completedAt: string | null; createdAt: string }
export interface DeliveryAttempt { id: string; tenantId: string; deliveryId: string; leadId: string; buyerId: string; offerId: string | null; programId: string | null; attemptNumber: number; deliveryMethod: string; status: DeliveryStatus; requestStartedAt: string | null; responseReceivedAt: string | null; responseTimeMs: number | null; externalReference: string; payout: number | null; createdAt: string }
export interface LeadRejection { id: string; tenantId: string; leadId: string; deliveryAttemptId: string; buyerId: string; rejectionCode: string; category: string; reason: string; recoverable: boolean; createdAt: string }
export interface LeadStatusEvent { id: string; tenantId: string; leadId: string; fromStatus: LeadStatus | null; toStatus: LeadStatus; reason: string; changedBy: string | null; createdAt: string }
export interface Integration { id: string; tenantId: string; name: string; kind: string; status: 'connected' | 'needs_attention' | 'not_configured'; updatedAt: string }
export interface TenantSetting { id: string; tenantId: string; key: string; value: string }
export interface AuditEvent { id: string; tenantId: string | null; actor: string; eventType: string; entityType: string; entityId: string; occurredAt: string }
export interface SessionUser { id: string; name: string; email: string; isPlatformAdmin: boolean }
