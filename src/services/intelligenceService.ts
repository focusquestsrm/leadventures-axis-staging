import { calculateIntelligence, type IntelligenceFilters, type IntelligenceInput, type IntelligenceReport } from '../lib/metrics'
import { demoMode, supabase } from '../lib/supabase'

function isReport(value: unknown): value is IntelligenceReport {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<IntelligenceReport>
  return typeof row.tenantId === 'string' && Boolean(row.kpis) && Array.isArray(row.funnel) && Array.isArray(row.sources) && Array.isArray(row.buyers)
}

export const intelligenceService = {
  async getReport(input: IntelligenceInput, filters: IntelligenceFilters): Promise<IntelligenceReport> {
    if (demoMode) return calculateIntelligence(input, filters)
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.rpc('axis_intelligence_snapshot', {
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
    })
    if (error) throw error
    if (!isReport(data)) throw new Error('Intelligence response did not match the expected contract.')
    return data
  },
}
