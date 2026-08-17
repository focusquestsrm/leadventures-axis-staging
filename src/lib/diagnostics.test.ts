import { afterEach, describe, expect, it, vi } from 'vitest'
import { logWorkspaceDiagnostic, redactDiagnosticMessage } from './diagnostics'

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

  it('uses the failing query operation when one is provided', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const diagnostic = logWorkspaceDiagnostic('workspace.initialize', {
      operation: 'workspace.programs',
      code: '42703',
      message: 'column programs.category does not exist',
    })

    expect(diagnostic).toEqual({
      operation: 'workspace.programs',
      code: '42703',
      message: 'column programs.category does not exist',
    })
    expect(consoleError).toHaveBeenCalledWith('[Axis] Workspace operation failed', diagnostic)
  })
})

describe('production diagnostic redaction', () => {
  it('removes identity, authorization, secret, and query credential values', () => {
    const safe = redactDiagnosticMessage('user@example.com +1 (804) 555-0199 Bearer abc.def_xyz https://x.test?a=1&access_token=hidden sb_secret_danger')
    expect(safe).not.toMatch(/user@example|804|abc\.def|access_token=hidden|sb_secret_danger/)
    expect(safe).toContain('[redacted email]')
    expect(safe).toContain('[redacted phone]')
    expect(safe).toContain('[redacted authorization]')
  })
})
