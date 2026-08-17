export type Role = 'platform_admin' | 'tenant_admin' | 'manager' | 'media_buyer' | 'analyst' | 'viewer'
export type TenantRole = Exclude<Role, 'platform_admin'>
export type Permission =
  | 'tenant:read' | 'tenant:manage' | 'membership:read' | 'membership:manage'
  | 'lead:read' | 'lead:write' | 'lead:identity:read'
  | 'buyer:read' | 'buyer:write' | 'offer:read' | 'offer:write'
  | 'source:read' | 'source:write' | 'delivery:read' | 'delivery:write' | 'capacity:read' | 'capacity:write'
  | 'integration:read' | 'integration:manage' | 'recovery:read' | 'recovery:manage' | 'recovery:approve' | 'audit:read' | 'platform:manage'

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
export type IntegrationCategory = 'lead_distribution' | 'crm' | 'media' | 'webhook' | 'file_import' | 'api' | 'data_warehouse' | 'other'
export type ImportStatus = 'draft' | 'validating' | 'ready' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled'
export type OutcomeType = 'contacted' | 'qualified' | 'appointment' | 'application' | 'enrollment' | 'sale' | 'start' | 'completed' | 'cancelled' | 'lost' | 'other'
export interface Integration { id: string; tenantId: string; name: string; kind: string; category: IntegrationCategory; vendor: string; status: 'connected' | 'needs_attention' | 'not_configured'; lastSyncAt: string | null; lastSuccessAt: string | null; recordsProcessed: number; errorCount: number; health: 'healthy' | 'attention' | 'not_configured'; updatedAt: string }
export interface IntegrationFieldMapping { id: string; tenantId: string; integrationId: string; externalField: string; axisField: string; required: boolean; transform: string; updatedAt: string }
export interface IntegrationImportBatch { id: string; tenantId: string; integrationId: string; fileName: string; status: ImportStatus; rowsReceived: number; rowsValid: number; rowsInvalid: number; rowsImported: number; rowsDuplicate: number; rowsUnmatched: number; startedAt: string; completedAt: string | null; createdAt: string }
export interface IntegrationImportError { id: string; tenantId: string; integrationId: string; importBatchId: string; rowNumber: number; errorCode: string; safeMessage: string; resolutionStatus: 'open' | 'resolved' | 'ignored'; createdAt: string }
export interface IntegrationSyncRun { id: string; tenantId: string; integrationId: string; status: 'running' | 'completed' | 'failed'; recordsProcessed: number; recordsCreated: number; recordsUpdated: number; recordsSkipped: number; recordsErrored: number; durationMs: number | null; startedAt: string; completedAt: string | null }
export interface LeadOutcome { id: string; tenantId: string; leadId: string; integrationId: string; importBatchId: string | null; externalOutcomeId: string; outcomeType: OutcomeType; outcomeStage: string; status: string; occurredAt: string; monetaryValue: number | null; currency: string; programId: string | null; buyerId: string | null; sourceSystem: string; externalRecordId: string; ingestedAt: string; createdAt: string }
export interface OutcomeMapping { id: string; tenantId: string; integrationId: string; externalValue: string; outcomeType: OutcomeType; outcomeStage: string; active: boolean; updatedAt: string }
export type RecoveryExecutionMode = 'advisory' | 'approval_required' | 'automatic'
export type RecoveryPathType = 'host_post' | 'secondary_buyer' | 'link_out' | 'offer_wall' | 'manual_review'
export type RecoveryStatus = 'eligible' | 'queued' | 'in_progress' | 'recovered' | 'exhausted' | 'blocked' | 'manual_review' | 'cancelled'
export interface RecoveryPolicy { id:string;tenantId:string;name:string;status:'active'|'paused';priority:number;rejectionCategory:string;programId:string|null;offerId:string|null;sourceBuyerId:string|null;maxAttempts:number;maxAttemptsPerBuyer:number;maxDestinations:number;maxLeadAgeMinutes:number;requireConsentConfirmation:boolean;allowSecondaryHostPost:boolean;allowLinkOut:boolean;executionMode:RecoveryExecutionMode;updatedAt:string }
export interface RecoveryPath { id:string;tenantId:string;recoveryPolicyId:string;buyerId:string|null;offerId:string|null;programId:string|null;pathType:RecoveryPathType;priority:number;status:'active'|'paused';payoutOverride:number|null;destinationReference:string|null;updatedAt:string }
export interface LeadRecovery { id:string;tenantId:string;leadId:string;originatingRejectionId:string;recoveryPolicyId:string;status:RecoveryStatus;executionMode:RecoveryExecutionMode;consentStatus:'confirmed'|'missing'|'not_required'|'blocked';consentScope:string;consentVersion:string;secondaryDeliveryAllowed:boolean;consentConfirmedAt:string|null;eligibilityCode:string;explanation:string[];recommendedPathId:string|null;idempotencyKey:string;startedAt:string|null;completedAt:string|null;recoveryValue:number|null;incrementalCost:number|null;currency:string;createdAt:string;updatedAt:string }
export interface RecoveryAttempt { id:string;tenantId:string;leadRecoveryId:string;leadId:string;buyerId:string|null;offerId:string|null;programId:string|null;recoveryPathId:string|null;pathType:RecoveryPathType;attemptNumber:number;status:'pending'|'eligible'|'attempted'|'accepted'|'rejected'|'skipped'|'blocked'|'timeout'|'error';deliveryAttemptId:string|null;transactionKey:string;startedAt:string|null;completedAt:string|null;reason:string;explanation:string[];estimatedValue:number|null;actualValue:number|null;incrementalCost:number|null;createdAt:string }
export interface RecoveryReview { id:string;tenantId:string;leadRecoveryId:string;leadId:string;reasonCode:string;safeReason:string;status:'open'|'approved'|'blocked'|'resolved';selectedPathId:string|null;resolvedBy:string|null;resolvedAt:string|null;createdAt:string }
export interface RecoveryEvent { id:string;tenantId:string;leadRecoveryId:string;leadId:string;eventType:string;safeDetail:string;occurredAt:string }
export interface TenantSetting { id: string; tenantId: string; key: string; value: string }
export interface AuditEvent { id: string; tenantId: string | null; actor: string; eventType: string; entityType: string; entityId: string; occurredAt: string }
export interface SessionUser { id: string; name: string; email: string; isPlatformAdmin: boolean }
