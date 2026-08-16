import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { can } from '../lib/rbac'
import { demoMode, supabase } from '../lib/supabase'
import { platformService, type PlatformSnapshot } from '../services/platformService'
import type { Permission, Role, Tenant } from '../types'
import { logWorkspaceDiagnostic } from '../lib/diagnostics'

interface AppContextValue {
  data: PlatformSnapshot
  tenant: Tenant
  role?: Role
  setTenantId: (tenantId: string) => void
  refresh: () => Promise<void>
  allowed: (permission: Permission) => boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlatformSnapshot | null>(null)
  const [tenantId, setTenantId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [authReady, setAuthReady] = useState(demoMode)
  const [authenticated, setAuthenticated] = useState(demoMode)

  const refresh = useCallback(async (requestedTenantId?: string) => {
    try {
      setError('')
      const next = await platformService.getSnapshot(requestedTenantId || undefined)
      setData(next)
      setTenantId((current) => current || next.tenants.find((tenant) => next.memberships.some((m) => m.tenantId === tenant.id && m.userId === next.user.id))?.id || '')
    } catch (caught) {
      logWorkspaceDiagnostic(requestedTenantId ? 'workspace.refresh' : 'workspace.initialize', caught)
      setError('Axis could not load your workspace. Please try again.')
    }
  }, [])

  const selectTenant = useCallback((nextTenantId: string) => {
    if (!data) return
    const authorized = data.user.isPlatformAdmin || data.memberships.some((membership) => membership.tenantId === nextTenantId && membership.userId === data.user.id && membership.status === 'active')
    if (!authorized || !data.tenants.some((tenant) => tenant.id === nextTenantId)) return
    setTenantId(nextTenantId)
    setData((current) => current ? { ...current, programs: [], leads: [], buyers: [], offers: [], integrations: [], tenantSettings: [], auditEvents: [] } : current)
    void refresh(nextTenantId)
  }, [data, refresh])

  useEffect(() => {
    if (demoMode) { void refresh(); return }
    if (!supabase) { setAuthReady(true); return }
    void supabase.auth.getSession().then(({ data: { session } }) => { setAuthenticated(Boolean(session)); setAuthReady(true); if (session) void refresh() })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setAuthenticated(Boolean(session)); if (session) void refresh(); else setData(null) })
    return () => listener.subscription.unsubscribe()
  }, [refresh])

  const value = useMemo<AppContextValue | null>(() => {
    if (!data) return null
    const authorized = data.user.isPlatformAdmin
      ? data.tenants
      : data.tenants.filter((item) => data.memberships.some((m) => m.tenantId === item.id && m.userId === data.user.id && m.status === 'active'))
    const tenant = authorized.find((item) => item.id === tenantId) ?? authorized[0]
    if (!tenant) return null
    const role = data.memberships.find((m) => m.tenantId === tenant.id && m.userId === data.user.id)?.role
    return { data, tenant, role, setTenantId: selectTenant, refresh: () => refresh(tenant.id), allowed: (permission) => can(role, permission, data.user.isPlatformAdmin) }
  }, [data, tenantId, refresh, selectTenant])

  if (!authReady) return <div className="center-state"><div className="loader" /><p>Checking your secure session…</p></div>
  if (!demoMode && !supabase) return <div className="center-state"><h1>Connect Axis to continue</h1><p>Configure the Supabase staging environment variables.</p></div>
  if (!authenticated) return <SignIn />
  if (error) return <div className="center-state"><h1>Unable to load Axis</h1><p>{error}</p><button onClick={() => void refresh()}>Try again</button></div>
  if (!value) return <div className="center-state" aria-live="polite"><div className="loader" /><p>Securing your workspace…</p></div>
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function SignIn() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const { error: authError } = await supabase!.auth.signInWithPassword({ email: String(form.get('email')), password: String(form.get('password')) })
    if (authError) setError('Sign-in failed. Check your credentials and try again.')
    setBusy(false)
  }
  return <main className="auth-page"><section className="auth-brand"><div className="brand-mark large">A</div><span>LEAD VENTURES</span><strong>AXIS</strong><p>Intelligence for Lead-Driven Growth</p></section><section className="auth-card"><span className="eyebrow">Secure staging access</span><h1>Welcome back</h1><p>Sign in to your authorized Axis workspace.</p><form onSubmit={(event) => void submit(event)}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></section></main>
}

// This module intentionally co-locates the context hook with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}
