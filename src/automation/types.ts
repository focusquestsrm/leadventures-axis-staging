export type AutomationMode = 'advisory' | 'approval_required' | 'bounded_auto' | 'disabled'
export type AutomationEngine = 'acquire' | 'convert' | 'route' | 'recover' | 'optimize' | 'integration'
export type AutomationActionType =
  | 'pause_campaign' | 'resume_campaign' | 'increase_budget' | 'decrease_budget' | 'change_campaign_status'
  | 'shift_buyer_allocation' | 'pause_buyer_delivery' | 'resume_buyer_delivery' | 'change_routing_weight'
  | 'approve_recovery' | 'execute_recovery_path' | 'pause_recovery_path'
  | 'acknowledge_recommendation' | 'approve_recommendation' | 'execute_recommendation'
  | 'activate_experiment_variant' | 'pause_experiment' | 'declare_experiment_winner'
  | 'retry_sync' | 'pause_sync' | 'resume_sync'
export type AutomationActionStatus = 'draft' | 'awaiting_approval' | 'approved' | 'scheduled' | 'executing' | 'succeeded' | 'partially_succeeded' | 'failed' | 'cancelled' | 'rolled_back' | 'expired' | 'blocked'
export type RollbackStatus = 'available' | 'not_available' | 'requested' | 'executing' | 'succeeded' | 'failed'
export type FreshnessBehavior = 'warn' | 'require_approval' | 'block'
export type ExecutionMode = 'simulated' | 'live'
export type AutomationConfidence = 'low' | 'medium' | 'high'
export type AutomationFreshness = 'fresh' | 'delayed' | 'stale' | 'unknown'

export interface AutomationLimits {
  maxPercentageIncrease: number | null
  maxPercentageDecrease: number | null
  maxAbsoluteDailyChange: number | null
  maxDailyBudget: number | null
  maxMonthlySpend: number | null
  maxActionsPerPeriod: number
  periodMinutes: number
  cooldownMinutes: number
  maxAllocationPercentage: number | null
  maxRecoveryAttempts: number | null
}

export interface AutomationSettings {
  id: string
  tenantId: string
  defaultMode: AutomationMode
  killSwitchEnabled: boolean
  freshnessBehavior: FreshnessBehavior
  minimumAutoConfidence: AutomationConfidence
  minimumSampleSize: number
  executionMode: ExecutionMode
  updatedAt: string
}

export interface AutomationPolicy {
  id: string
  tenantId: string
  name: string
  engine: AutomationEngine
  actionType: AutomationActionType
  mode: AutomationMode
  status: 'active' | 'paused' | 'draft'
  priority: number
  approvalRequired: boolean
  requiredApprovals: number
  conditions: Record<string, unknown>
  limits: AutomationLimits
  updatedAt: string
}

export interface AutomationAction {
  id: string
  tenantId: string
  policyId: string
  recommendationId: string | null
  engine: AutomationEngine
  actionType: AutomationActionType
  targetType: string
  targetId: string
  targetLabel: string
  status: AutomationActionStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  requestedBy: string | null
  approvedBy: string | null
  executedBy: string | null
  parameters: Record<string, unknown>
  previousState: Record<string, unknown>
  proposedState: Record<string, unknown>
  evidence: string[]
  expectedImpact: Record<string, number | null>
  actualImpact: Record<string, number | null> | null
  impactBasis: 'estimated' | 'observed' | 'verified' | null
  confidence: AutomationConfidence
  sampleSize: number
  freshness: AutomationFreshness
  risk: 'low' | 'medium' | 'high' | 'critical'
  idempotencyKey: string
  requiredApprovals: number
  approvalCount: number
  rollbackStatus: RollbackStatus
  failureCode: string | null
  failureMessage: string | null
  createdAt: string
  approvedAt: string | null
  executedAt: string | null
  completedAt: string | null
  expiresAt: string | null
}

export interface AutomationApproval {
  id: string
  tenantId: string
  actionId: string
  decision: 'approved' | 'rejected'
  decidedBy: string | null
  safeNote: string
  decidedAt: string
}

export interface AutomationExecution {
  id: string
  tenantId: string
  actionId: string
  mode: ExecutionMode
  status: 'executing' | 'succeeded' | 'partially_succeeded' | 'failed' | 'blocked'
  idempotencyKey: string
  previousState: Record<string, unknown>
  requestedState: Record<string, unknown>
  connectorStatus: string
  safeErrorCode: string | null
  rollbackAvailable: boolean
  startedAt: string
  completedAt: string | null
}

export interface AutomationRollback {
  id: string
  tenantId: string
  actionId: string
  executionId: string
  status: Exclude<RollbackStatus, 'available' | 'not_available'>
  restoreState: Record<string, unknown>
  safeReason: string
  requestedAt: string
  completedAt: string | null
}

export interface AutomationCircuitBreaker {
  id: string
  tenantId: string
  engine: AutomationEngine
  actionType: AutomationActionType | null
  status: 'open' | 'reviewing' | 'resolved'
  reasonCode: string
  safeReason: string
  evidence: Record<string, unknown>
  triggeredAt: string
  resolvedAt: string | null
}

export interface AutomationNotification {
  id: string
  tenantId: string
  type: 'approval_required' | 'action_failed' | 'circuit_breaker' | 'automation_paused' | 'rollback_failed' | 'threshold_reached'
  severity: 'info' | 'warning' | 'critical'
  title: string
  safeMessage: string
  actionId: string | null
  readAt: string | null
  createdAt: string
}

export interface AutomationWorkspace {
  settings: AutomationSettings
  policies: AutomationPolicy[]
  actions: AutomationAction[]
  approvals: AutomationApproval[]
  executions: AutomationExecution[]
  rollbacks: AutomationRollback[]
  circuitBreakers: AutomationCircuitBreaker[]
  notifications: AutomationNotification[]
  platformExecutionSuspended: boolean
}

export interface ExecutionGateContext {
  tenantId: string
  targetTenantId: string
  tenantActive: boolean
  integrationActive: boolean
  credentialsAvailable: boolean
  connectorMode: ExecutionMode
  authorized: boolean
  capabilityAllowed: boolean
  complianceCleared: boolean
  idempotencyUnique: boolean
  platformExecutionSuspended: boolean
  circuitBreakerOpen: boolean
  recommendationExpiresAt: string | null
  now: string
  actionsInPeriod: number
  lastMatchingActionAt: string | null
  approvedCount: number
  currentBudget?: number
  proposedBudget?: number
  monthlySpend?: number
  routing?: { buyerApproved: boolean; buyerActive: boolean; programEligible: boolean; geographyEligible: boolean; remainingCapacity: number; duplicateAllowed: boolean; exclusiveAllowed: boolean; allocationPercentage: number; previousAttemptAllowed: boolean }
  recovery?: { eligible: boolean; manualReview: boolean; consentCleared: boolean; pathAllowed: boolean; leadAgeAllowed: boolean; duplicateAllowed: boolean; attempts: number }
}

export interface ExecutionGateResult {
  allowed: boolean
  status: 'approved' | 'awaiting_approval' | 'blocked'
  reasons: string[]
  warnings: string[]
  requiresApproval: boolean
}
