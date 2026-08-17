import { evaluateExecutionGates } from '../automation/domain'
import type { AutomationAction, AutomationExecution, AutomationPolicy, AutomationSettings, ExecutionGateContext } from '../automation/types'

export interface ConnectorActionRequest {
  tenantId: string
  integrationReference: string
  actionType: AutomationAction['actionType']
  targetType: string
  targetId: string
  parameters: Record<string, unknown>
  idempotencyKey: string
}

export interface ConnectorActionResult {
  status: 'succeeded' | 'partially_succeeded' | 'failed'
  safeStatus: string
  previousState: Record<string, unknown>
  appliedState: Record<string, unknown>
  safeErrorCode: string | null
  rollbackAvailable: boolean
}

export interface ConnectorMutationAdapter {
  readonly mode: 'simulated' | 'live'
  executeAction(request: ConnectorActionRequest): Promise<ConnectorActionResult>
  rollbackAction?(request: ConnectorActionRequest, restoreState: Record<string, unknown>): Promise<ConnectorActionResult>
}

export class SandboxConnectorAdapter implements ConnectorMutationAdapter {
  readonly mode = 'simulated' as const
  async executeAction(request: ConnectorActionRequest): Promise<ConnectorActionResult> {
    if (request.parameters.simulateFailure === true) return { status: 'failed', safeStatus: 'SIMULATED_CONNECTOR_FAILURE', previousState: {}, appliedState: {}, safeErrorCode: 'SIMULATED_FAILURE', rollbackAvailable: false }
    return { status: 'succeeded', safeStatus: 'SIMULATED_SUCCESS', previousState: {}, appliedState: request.parameters, safeErrorCode: null, rollbackAvailable: true }
  }
  async rollbackAction(_request: ConnectorActionRequest, restoreState: Record<string, unknown>): Promise<ConnectorActionResult> {
    return { status: 'succeeded', safeStatus: 'SIMULATED_ROLLBACK_SUCCESS', previousState: {}, appliedState: restoreState, safeErrorCode: null, rollbackAvailable: false }
  }
}

export class TrustedServerConnectorBoundary implements ConnectorMutationAdapter {
  readonly mode = 'live' as const
  async executeAction(): Promise<ConnectorActionResult> { throw new Error('Live automation requires a separately deployed trusted server adapter.') }
}

export function createExecutionService(adapter: ConnectorMutationAdapter) {
  const completed = new Map<string, AutomationExecution>()
  let consecutiveFailures = 0
  return {
    async execute(settings: AutomationSettings, policy: AutomationPolicy, action: AutomationAction, context: ExecutionGateContext) {
      const existing = completed.get(action.idempotencyKey)
      if (existing) return { gate: { allowed: true, status: 'approved' as const, reasons: [], warnings: [], requiresApproval: false }, execution: existing, idempotent: true, circuitBreakerTriggered: false }
      const gate = evaluateExecutionGates(settings, policy, action, context)
      if (!gate.allowed) return { gate, execution: null, idempotent: false, circuitBreakerTriggered: false }
      const startedAt = context.now
      const result = await adapter.executeAction({ tenantId: action.tenantId, integrationReference: String(action.parameters.integrationReference ?? 'server-managed'), actionType: action.actionType, targetType: action.targetType, targetId: action.targetId, parameters: action.parameters, idempotencyKey: action.idempotencyKey })
      consecutiveFailures = result.status === 'failed' ? consecutiveFailures + 1 : 0
      const execution: AutomationExecution = { id: `execution-${action.id}`, tenantId: action.tenantId, actionId: action.id, mode: adapter.mode, status: result.status, idempotencyKey: action.idempotencyKey, previousState: result.previousState, requestedState: result.appliedState, connectorStatus: result.safeStatus, safeErrorCode: result.safeErrorCode, rollbackAvailable: result.rollbackAvailable, startedAt, completedAt: context.now }
      if (result.status !== 'failed') completed.set(action.idempotencyKey, execution)
      return { gate, execution, idempotent: false, circuitBreakerTriggered: consecutiveFailures >= 3 }
    },
    async rollback(action: AutomationAction, execution: AutomationExecution, safeReason: string) {
      if (!execution.rollbackAvailable || !adapter.rollbackAction) return { status: 'not_available' as const, safeReason }
      const result = await adapter.rollbackAction({ tenantId: action.tenantId, integrationReference: String(action.parameters.integrationReference ?? 'server-managed'), actionType: action.actionType, targetType: action.targetType, targetId: action.targetId, parameters: action.parameters, idempotencyKey: `${action.idempotencyKey}:rollback` }, execution.previousState)
      return { status: result.status === 'succeeded' ? 'succeeded' as const : 'failed' as const, safeReason }
    },
  }
}
