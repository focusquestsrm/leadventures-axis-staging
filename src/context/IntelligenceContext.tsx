import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultIntelligenceFilters, type IntelligenceFilters, type IntelligenceReport } from '../lib/metrics'
import { logWorkspaceDiagnostic } from '../lib/diagnostics'
import { intelligenceService } from '../services/intelligenceService'
import { useApp } from './AppContext'

interface IntelligenceContextValue {
  filters: IntelligenceFilters
  setFilters: (filters: IntelligenceFilters) => void
  report: IntelligenceReport | null
  loading: boolean
  error: string
  refresh: () => void
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null)

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const { data, tenant } = useApp()
  const [filters, setFiltersState] = useState<IntelligenceFilters>(() => defaultIntelligenceFilters())
  const [report, setReport] = useState<IntelligenceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    setFiltersState((current) => ({ ...current, trafficSourceId:'', campaignId:'', buyerId:'', programId:'', offerId:'', leadStatus:'' }))
  }, [tenant.id])

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    const scoped = { tenantId: tenant.id, leads: data.leads, attempts: data.deliveryAttempts, rejections: data.leadRejections, buyers: data.buyers, programs: data.programs, buyerPrograms: data.buyerPrograms, buyerCaps: data.buyerCaps, trafficSources: data.trafficSources, campaigns: data.campaigns }
    void intelligenceService.getReport(scoped, filters).then((next) => { if (active) setReport(next) }).catch((caught) => { const diagnostic = logWorkspaceDiagnostic('intelligence.load', caught); if (active) setError(`Intelligence is temporarily unavailable (${diagnostic.code}).`) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [data, filters, tenant.id, version])

  const setFilters = (next: IntelligenceFilters) => setFiltersState(next)
  const value = useMemo(() => ({ filters, setFilters, report, loading, error, refresh: () => setVersion((current) => current + 1) }), [error, filters, loading, report])
  return <IntelligenceContext.Provider value={value}>{children}</IntelligenceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIntelligence() {
  const value = useContext(IntelligenceContext)
  if (!value) throw new Error('useIntelligence must be used inside IntelligenceProvider')
  return value
}
