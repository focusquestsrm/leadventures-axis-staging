interface ErrorLike {
  code?: unknown
  message?: unknown
  operation?: unknown
}

const redact = (value: string) => value
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
  .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted token]')
  .slice(0, 240)

export interface WorkspaceDiagnostic {
  operation: string
  code: string
  message: string
}

export function getWorkspaceDiagnostic(defaultOperation: string, caught: unknown): WorkspaceDiagnostic {
  const error = caught && typeof caught === 'object' ? caught as ErrorLike : undefined
  const operation = typeof error?.operation === 'string' ? error.operation : defaultOperation
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN'
  const message = typeof error?.message === 'string' ? redact(error.message) : 'Supabase operation failed.'
  return { operation, code, message }
}

export function logWorkspaceDiagnostic(defaultOperation: string, caught: unknown) {
  const diagnostic = getWorkspaceDiagnostic(defaultOperation, caught)
  console.error('[Axis] Workspace operation failed', diagnostic)
  return diagnostic
}
