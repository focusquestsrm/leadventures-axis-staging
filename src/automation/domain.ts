import type { AutomationAction, AutomationConfidence, AutomationPolicy, AutomationSettings, ExecutionGateContext, ExecutionGateResult } from './types'

const confidenceRank: Record<AutomationConfidence, number> = { low: 0, medium: 1, high: 2 }
const budgetActions = new Set(['increase_budget', 'decrease_budget'])
const routingActions = new Set(['shift_buyer_allocation', 'pause_buyer_delivery', 'resume_buyer_delivery', 'change_routing_weight'])
const recoveryActions = new Set(['approve_recovery', 'execute_recovery_path', 'pause_recovery_path'])
const sensitiveKeys = /(^|_)(email|phone|first_?name|last_?name|address|ssn|dob|birth|password|secret|token|jwt|authorization|credential|api_?key)($|_)/i
const sensitiveValues = /\bbearer\s+[a-z0-9._~-]+|eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}/i

export function metadataIsSafe(value: unknown): boolean {
  if (typeof value === 'string') return !sensitiveValues.test(value)
  if (Array.isArray(value)) return value.every(metadataIsSafe)
  if (value && typeof value === 'object') return Object.entries(value).every(([key, child]) => !sensitiveKeys.test(key) && metadataIsSafe(child))
  return true
}

export function evaluateExecutionGates(settings: AutomationSettings, policy: AutomationPolicy, action: AutomationAction, context: ExecutionGateContext): ExecutionGateResult {
  const reasons: string[] = []
  const warnings: string[] = []
  let requiresApproval = settings.defaultMode === 'approval_required' || policy.mode === 'approval_required' || policy.approvalRequired
  const effectiveMode = policy.mode === 'disabled' || settings.defaultMode === 'disabled' ? 'disabled' : policy.mode === 'advisory' || settings.defaultMode === 'advisory' ? 'advisory' : policy.mode

  if (context.tenantId !== context.targetTenantId || action.tenantId !== context.tenantId || policy.tenantId !== context.tenantId) reasons.push('Tenant boundary validation failed.')
  if (!context.tenantActive) reasons.push('Tenant is not active.')
  if (settings.killSwitchEnabled) reasons.push('Tenant automation kill switch is enabled.')
  if (context.platformExecutionSuspended) reasons.push('Platform execution infrastructure is suspended.')
  if (context.circuitBreakerOpen) reasons.push('An automation circuit breaker is open.')
  if (!context.authorized || !context.capabilityAllowed) reasons.push('Execution capability is not authorized.')
  if (policy.status !== 'active') reasons.push('Automation policy is not active.')
  if (policy.actionType !== action.actionType || policy.engine !== action.engine) reasons.push('Action is not permitted by this policy.')
  if (effectiveMode === 'disabled') reasons.push('Automation is disabled.')
  if (effectiveMode === 'advisory') reasons.push('Advisory mode cannot execute actions.')
  if (!context.integrationActive) reasons.push('Required integration is not active.')
  if (context.connectorMode === 'live' && !context.credentialsAvailable) reasons.push('Server-side connector credentials are unavailable.')
  if (!context.complianceCleared) reasons.push('Compliance gate did not clear the action.')
  if (!context.idempotencyUnique) reasons.push('Execution idempotency key has already been used.')
  if (!metadataIsSafe(action.parameters) || !metadataIsSafe(action.evidence)) reasons.push('Action metadata contains prohibited sensitive fields or credentials.')
  if (context.recommendationExpiresAt && Date.parse(context.recommendationExpiresAt) <= Date.parse(context.now)) reasons.push('Linked recommendation has expired.')
  if (context.actionsInPeriod >= policy.limits.maxActionsPerPeriod) reasons.push('Action rate limit has been reached.')
  if (context.lastMatchingActionAt && Date.parse(context.now) - Date.parse(context.lastMatchingActionAt) < policy.limits.cooldownMinutes * 60_000) reasons.push('Action cooldown is still active.')

  if (action.sampleSize < settings.minimumSampleSize) reasons.push('Sample size is below the configured minimum.')
  if (action.confidence === 'low') reasons.push('Low-confidence actions remain advisory.')
  else if (confidenceRank[action.confidence] < confidenceRank[settings.minimumAutoConfidence]) requiresApproval = true

  if (action.freshness !== 'fresh') {
    if (settings.freshnessBehavior === 'block') reasons.push('Required data is not fresh.')
    else if (settings.freshnessBehavior === 'require_approval') requiresApproval = true
    else warnings.push(`Data freshness is ${action.freshness}.`)
  }

  if (budgetActions.has(action.actionType)) validateBudget(policy, context, reasons)
  if (routingActions.has(action.actionType)) validateRouting(policy, context, reasons)
  if (recoveryActions.has(action.actionType)) validateRecovery(policy, context, reasons)

  if (reasons.length) return { allowed: false, status: 'blocked', reasons, warnings, requiresApproval }
  const requiredApprovals = Math.max(action.requiredApprovals, policy.requiredApprovals, requiresApproval ? 1 : 0)
  if (requiresApproval && context.approvedCount < requiredApprovals) return { allowed: false, status: 'awaiting_approval', reasons: [`${requiredApprovals - context.approvedCount} approval${requiredApprovals - context.approvedCount === 1 ? '' : 's'} still required.`], warnings, requiresApproval: true }
  return { allowed: true, status: 'approved', reasons: [], warnings, requiresApproval }
}

function validateBudget(policy: AutomationPolicy, context: ExecutionGateContext, reasons: string[]) {
  const current = context.currentBudget
  const proposed = context.proposedBudget
  if (current == null || proposed == null || current < 0 || proposed < 0) { reasons.push('Valid current and proposed budgets are required.'); return }
  const delta = proposed - current
  const percent = current === 0 ? (delta === 0 ? 0 : Number.POSITIVE_INFINITY) : Math.abs(delta / current * 100)
  if (delta > 0 && policy.limits.maxPercentageIncrease != null && percent > policy.limits.maxPercentageIncrease) reasons.push('Budget percentage increase exceeds policy limit.')
  if (delta < 0 && policy.limits.maxPercentageDecrease != null && percent > policy.limits.maxPercentageDecrease) reasons.push('Budget percentage decrease exceeds policy limit.')
  if (policy.limits.maxAbsoluteDailyChange != null && Math.abs(delta) > policy.limits.maxAbsoluteDailyChange) reasons.push('Absolute daily budget change exceeds policy limit.')
  if (policy.limits.maxDailyBudget != null && proposed > policy.limits.maxDailyBudget) reasons.push('Proposed daily budget exceeds policy limit.')
  if (policy.limits.maxMonthlySpend != null && (context.monthlySpend == null || context.monthlySpend + Math.max(0, delta) > policy.limits.maxMonthlySpend)) reasons.push('Monthly spend limit would be exceeded or cannot be verified.')
}

function validateRouting(policy: AutomationPolicy, context: ExecutionGateContext, reasons: string[]) {
  const routing = context.routing
  if (!routing) { reasons.push('Routing eligibility evidence is unavailable.'); return }
  if (!routing.buyerApproved || !routing.buyerActive) reasons.push('Buyer is not approved and active.')
  if (!routing.programEligible || !routing.geographyEligible) reasons.push('Program or geography eligibility failed.')
  if (routing.remainingCapacity <= 0) reasons.push('Buyer has no remaining capacity.')
  if (!routing.duplicateAllowed || !routing.exclusiveAllowed || !routing.previousAttemptAllowed) reasons.push('Duplicate, exclusivity, or previous-attempt restrictions failed.')
  if (policy.limits.maxAllocationPercentage != null && routing.allocationPercentage > policy.limits.maxAllocationPercentage) reasons.push('Routing allocation exceeds policy maximum.')
}

function validateRecovery(policy: AutomationPolicy, context: ExecutionGateContext, reasons: string[]) {
  const recovery = context.recovery
  if (!recovery) { reasons.push('Recovery eligibility evidence is unavailable.'); return }
  if (!recovery.eligible || recovery.manualReview) reasons.push('Recovery is ineligible or requires manual review.')
  if (!recovery.consentCleared || !recovery.pathAllowed || !recovery.leadAgeAllowed || !recovery.duplicateAllowed) reasons.push('Recovery consent, path, age, or duplicate gate failed.')
  if (policy.limits.maxRecoveryAttempts != null && recovery.attempts >= policy.limits.maxRecoveryAttempts) reasons.push('Recovery attempt limit has been reached.')
}

export function automationValue(actions: AutomationAction[]) {
  return actions.reduce((totals, action) => {
    if (!action.actualImpact || !action.impactBasis) return totals
    for (const [key, value] of Object.entries(action.actualImpact)) if (typeof value === 'number') totals[key] = (totals[key] ?? 0) + value
    return totals
  }, {} as Record<string, number>)
}
