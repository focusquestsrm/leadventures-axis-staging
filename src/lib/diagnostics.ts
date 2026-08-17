interface ErrorLike {
  code?: unknown
  message?: unknown
  operation?: unknown
}

export const redactDiagnosticMessage = (value: string) => value
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
  .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[redacted phone]')
  .replace(/\b(?:bearer|basic)\s+[A-Za-z0-9._~+/-]+=*/gi, '[redacted authorization]')
  .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted token]')
  .replace(/([?&](?:token|access_token|refresh_token|api_key|key|code)=)[^&\s]+/gi, '$1[redacted]')
  .replace(/\b(?:sk_(?:live|test)|sb_secret)_[A-Za-z0-9_-]+\b/gi, '[redacted secret]')
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
  const message = typeof error?.message === 'string' ? redactDiagnosticMessage(error.message) : 'Supabase operation failed.'
  return { operation, code, message }
}

export function logWorkspaceDiagnostic(defaultOperation: string, caught: unknown) {
  const diagnostic = getWorkspaceDiagnostic(defaultOperation, caught)
  console.error('[Axis] Workspace operation failed', diagnostic)
  return diagnostic
}
