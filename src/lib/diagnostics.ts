interface ErrorLike {
  code?: unknown
  message?: unknown
}

const redact = (value: string) => value
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
  .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted token]')
  .slice(0, 240)

export function logWorkspaceDiagnostic(operation: string, caught: unknown) {
  const error = caught && typeof caught === 'object' ? caught as ErrorLike : undefined
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN'
  const message = typeof error?.message === 'string' ? redact(error.message) : 'Supabase operation failed.'
  console.error('[Axis] Workspace operation failed', { operation, code, message })
}
