import { afterEach, describe, expect, it, vi } from 'vitest'
import { logWorkspaceDiagnostic } from './diagnostics'

describe('safe workspace diagnostics', () => {
  afterEach(() => vi.restoreAllMocks())

  it('logs an operation and code while redacting email and JWT-like values', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logWorkspaceDiagnostic('workspace.initialize', { code: 'PGRST201', message: 'user@example.test eyJabc.def.ghi relationship ambiguous' })
    expect(consoleError).toHaveBeenCalledWith('[Axis] Workspace operation failed', {
      operation: 'workspace.initialize',
      code: 'PGRST201',
      message: '[redacted email] [redacted token] relationship ambiguous',
    })
  })
})
