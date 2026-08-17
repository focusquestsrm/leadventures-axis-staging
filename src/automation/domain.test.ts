import { describe, expect, it } from 'vitest'
import { automationValue, evaluateExecutionGates, metadataIsSafe } from './domain'
import { release8Demo, release8DemoContexts } from '../data/release8Demo'
import { createExecutionService, SandboxConnectorAdapter, TrustedServerConnectorBoundary } from '../services/executionService'
import { can } from '../lib/rbac'
import type { AutomationAction, AutomationPolicy, AutomationSettings, ExecutionGateContext } from './types'

const setup = () => {
  const action = structuredClone(release8Demo.actions[0])
  const policy = structuredClone(release8Demo.policies.find((row) => row.id === action.policyId)!)
  const settings = structuredClone(release8Demo.settings)
  const context = structuredClone(release8DemoContexts[action.id])
  settings.defaultMode = 'bounded_auto'; settings.minimumSampleSize = 30; settings.minimumAutoConfidence = 'high'
  policy.mode = 'bounded_auto'; policy.approvalRequired = false; policy.requiredApprovals = 1
  context.now = '2026-08-17T12:00:00.000Z'; context.approvedCount = 0
  action.status = 'approved'; action.approvalCount = 0
  return { action, policy, settings, context }
}
const gate = (mutate: (state: ReturnType<typeof setup>) => void) => { const state = setup(); mutate(state); return evaluateExecutionGates(state.settings, state.policy, state.action, state.context) }
const reasons = (result: ReturnType<typeof evaluateExecutionGates>) => result.reasons.join(' ')

describe('Release 8 bounded orchestration', () => {
  it('1. advisory mode cannot execute', () => expect(gate((s) => { s.policy.mode = 'advisory' }).status).toBe('blocked'))
  it('2. approval-required mode requires approval', () => expect(gate((s) => { s.policy.mode = 'approval_required'; s.policy.approvalRequired = true }).status).toBe('awaiting_approval'))
  it('3. bounded-auto executes only a matching permitted action', () => expect(gate(() => {}).allowed).toBe(true))
  it('4. disabled mode blocks automation', () => expect(reasons(gate((s) => { s.settings.defaultMode = 'disabled' }))).toContain('disabled'))
  it('5. enforces budget percentage limits', () => expect(reasons(gate((s) => { s.context.proposedBudget = 500 }))).toContain('percentage increase'))
  it('6. enforces absolute budget limits', () => expect(reasons(gate((s) => { s.policy.limits.maxPercentageIncrease = 1000; s.context.proposedBudget = 1000 }))).toContain('Absolute daily'))
  it('7. enforces cooldowns', () => expect(reasons(gate((s) => { s.context.lastMatchingActionAt = '2026-08-17T11:30:00.000Z' }))).toContain('cooldown'))
  it('8. enforces action rate limits', () => expect(reasons(gate((s) => { s.context.actionsInPeriod = 5 }))).toContain('rate limit'))
  it('9. enforces buyer capacity', () => expect(reasons(gate((s) => { Object.assign(s.action, { engine: 'route', actionType: 'shift_buyer_allocation' }); Object.assign(s.policy, { engine: 'route', actionType: 'shift_buyer_allocation' }); s.context.routing!.remainingCapacity = 0 }))).toContain('capacity'))
  it('10. enforces buyer eligibility', () => expect(reasons(gate((s) => { Object.assign(s.action, { engine: 'route', actionType: 'shift_buyer_allocation' }); Object.assign(s.policy, { engine: 'route', actionType: 'shift_buyer_allocation' }); s.context.routing!.buyerApproved = false }))).toContain('approved and active'))
  it('11. enforces recovery compliance', () => expect(reasons(gate((s) => { Object.assign(s.action, { engine: 'recover', actionType: 'execute_recovery_path' }); Object.assign(s.policy, { engine: 'recover', actionType: 'execute_recovery_path' }); s.context.recovery!.consentCleared = false }))).toContain('consent'))
  it('12. blocks stale data under block policy', () => expect(reasons(gate((s) => { s.action.freshness = 'stale'; s.settings.freshnessBehavior = 'block' }))).toContain('not fresh'))
  it('13. low-confidence actions remain advisory', () => expect(reasons(gate((s) => { s.action.confidence = 'low' }))).toContain('Low-confidence'))
  it('14. blocks expired recommendations', () => expect(reasons(gate((s) => { s.context.recommendationExpiresAt = '2026-08-16T00:00:00.000Z' }))).toContain('expired'))
  it('15. makes successful execution idempotent', async () => { const s = setup(); const service = createExecutionService(new SandboxConnectorAdapter()); const first = await service.execute(s.settings, s.policy, s.action, s.context); const second = await service.execute(s.settings, s.policy, s.action, s.context); expect(first.idempotent).toBe(false); expect(second.idempotent).toBe(true) })
  it('16. preserves safe connector failure outcomes', async () => { const s = setup(); s.action.parameters.simulateFailure = true; const result = await createExecutionService(new SandboxConnectorAdapter()).execute(s.settings, s.policy, s.action, s.context); expect(result.execution?.safeErrorCode).toBe('SIMULATED_FAILURE') })
  it('17. permits a safe retry after failure', async () => { const s = setup(); const service = createExecutionService(new SandboxConnectorAdapter()); s.action.parameters.simulateFailure = true; await service.execute(s.settings, s.policy, s.action, s.context); s.action.parameters.simulateFailure = false; const retry = await service.execute(s.settings, s.policy, s.action, s.context); expect(retry.execution?.status).toBe('succeeded') })
  it('18. trips a circuit breaker after repeated failures', async () => { const s = setup(); const service = createExecutionService(new SandboxConnectorAdapter()); s.action.parameters.simulateFailure = true; let tripped = false; for (let index = 0; index < 3; index += 1) { s.action.idempotencyKey = `failure-${index}`; tripped = (await service.execute(s.settings, s.policy, s.action, s.context)).circuitBreakerTriggered } expect(tripped).toBe(true) })
  it('19. honors the tenant kill switch', () => expect(reasons(gate((s) => { s.settings.killSwitchEnabled = true }))).toContain('kill switch'))
  it('20. supports rollback where available', async () => { const s = setup(); const service = createExecutionService(new SandboxConnectorAdapter()); const execution = (await service.execute(s.settings, s.policy, s.action, s.context)).execution!; expect((await service.rollback(s.action, execution, 'Observed deterioration.')).status).toBe('succeeded') })
  it('21. does not promise unavailable rollback', async () => { const s = setup(); const execution = { ...release8Demo.executions[0], rollbackAvailable: false }; expect((await createExecutionService(new SandboxConnectorAdapter()).rollback(s.action, execution, 'Irreversible.')).status).toBe('not_available') })
  it('22. supports four-eyes approval thresholds', () => expect(reasons(gate((s) => { s.policy.mode = 'approval_required'; s.policy.requiredApprovals = 2; s.action.requiredApprovals = 2; s.context.approvedCount = 1 }))).toContain('1 approval'))
  it('23. viewer cannot approve or execute', () => { expect(can('viewer', 'automation:approve')).toBe(false); expect(can('viewer', 'automation:execute')).toBe(false) })
  it('24. media buyer cannot exceed assigned capability', () => expect(can('media_buyer', 'automation:configure')).toBe(false))
  it('25. tenant admin can configure policies', () => expect(can('tenant_admin', 'automation:configure')).toBe(true))
  it('26. isolates action, policy, and context tenants', () => expect(reasons(gate((s) => { s.policy.tenantId = 'other-tenant' }))).toContain('Tenant boundary'))
  it('27. rejects a cross-tenant action', () => expect(reasons(gate((s) => { s.action.tenantId = 'other-tenant' }))).toContain('Tenant boundary'))
  it('28. rejects a cross-tenant target context', () => expect(reasons(gate((s) => { s.context.targetTenantId = 'other-tenant' }))).toContain('Tenant boundary'))
  it('29. rejects PII in execution metadata', () => expect(metadataIsSafe({ leadId: 'l1', email: 'synthetic@example.test' })).toBe(false))
  it('30. rejects secrets and JWTs in browser metadata', () => expect(metadataIsSafe({ authorization: 'Bearer synthetic-token' })).toBe(false))
  it('31. distinguishes simulated and live execution boundaries', () => { expect(new SandboxConnectorAdapter().mode).toBe('simulated'); expect(new TrustedServerConnectorBoundary().mode).toBe('live') })
  it('32. preserves recommendation-to-action linkage', () => expect(release8Demo.actions.find((row) => row.id === 'action-budget')?.recommendationId).toBe('opt-rec-quality'))
  it('33. preserves action-to-actual-impact linkage', () => expect(release8Demo.actions.find((row) => row.id === 'action-recovery')?.impactBasis).toBe('observed'))
  it('34. blocks mismatched action type and policy engine', () => expect(reasons(gate((s) => { s.action.actionType = 'pause_campaign' }))).toContain('not permitted'))
  it('35. handles an empty tenant without fabricated value', () => expect(automationValue([])).toEqual({}))
  it('36. prevents unsafe execution when an integration is stale or inactive', () => expect(reasons(gate((s) => { s.context.integrationActive = false }))).toContain('not active'))
  it('37. blocks execution during platform suspension or an open breaker', () => { const result = gate((s) => { s.context.platformExecutionSuspended = true; s.context.circuitBreakerOpen = true }); expect(reasons(result)).toContain('Platform execution'); expect(reasons(result)).toContain('circuit breaker') })
})

export type Release8TestFixtures = { action: AutomationAction; policy: AutomationPolicy; settings: AutomationSettings; context: ExecutionGateContext }
