import { calculateIntelligence, type IntelligenceFilters, type IntelligenceInput, type IntelligenceReport } from '../lib/metrics'
import { demoMode, supabase } from '../lib/supabase'

function isReport(value: unknown): value is IntelligenceReport {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<IntelligenceReport>
  return typeof row.tenantId === 'string' && Boolean(row.kpis) && Array.isArray(row.funnel) && Array.isArray(row.sources) && Array.isArray(row.buyers)
}

type OutcomeExtension = Pick<IntelligenceReport,'outcomes'> & { sources: Partial<IntelligenceReport['sources'][number]>[]; buyers: Partial<IntelligenceReport['buyers'][number]>[]; programs: Partial<IntelligenceReport['programs'][number]>[] }
function isOutcomeExtension(value: unknown): value is OutcomeExtension { if (!value || typeof value!=='object') return false; const row=value as Partial<OutcomeExtension>; return Boolean(row.outcomes) && Array.isArray(row.sources) && Array.isArray(row.buyers) && Array.isArray(row.programs) }
const mergeDimensions = <T,K extends keyof T>(base:T[],extra:Partial<T>[],key:K): T[] => base.map((row) => ({ ...row,...extra.find((item) => item[key]===row[key]) }))

export const intelligenceService = {
  async getReport(input: IntelligenceInput, filters: IntelligenceFilters): Promise<IntelligenceReport> {
    if (demoMode) return calculateIntelligence(input, filters)
    if (!supabase) throw new Error('Supabase is not configured.')
    const args = {
      p_tenant_id: input.tenantId,
      p_start: filters.preset === 'custom' ? `${filters.start}T00:00:00.000Z` : null,
      p_end: filters.preset === 'custom' ? `${filters.end}T23:59:59.999Z` : null,
      p_preset: filters.preset,
      p_filters: {
        traffic_source_id: filters.trafficSourceId || null,
        campaign_id: filters.campaignId || null,
        buyer_id: filters.buyerId || null,
        program_id: filters.programId || null,
        offer_id: filters.offerId || null,
        lead_status: filters.leadStatus || null,
      },
    }
    const [{ data,error },outcomeResult] = await Promise.all([supabase.rpc('axis_intelligence_snapshot',args),supabase.rpc('axis_outcome_intelligence_snapshot',args)])
    if (error) throw error
    if (outcomeResult.error) throw outcomeResult.error
    if (!isReport(data)) throw new Error('Intelligence response did not match the expected contract.')
    if (!isOutcomeExtension(outcomeResult.data)) throw new Error('Outcome intelligence response did not match the expected contract.')
    const extension=outcomeResult.data
    return { ...data,outcomes:extension.outcomes,sources:mergeDimensions(data.sources,extension.sources,'sourceId'),buyers:mergeDimensions(data.buyers,extension.buyers,'buyerId'),programs:mergeDimensions(data.programs,extension.programs,'programId') }
  },
}
