import type { Buyer, BuyerCap, BuyerProgram, Campaign, DeliveryAttempt, Lead, LeadOutcome, LeadRejection, Program, TrafficSource } from '../types'

export type DatePreset = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom'

export interface IntelligenceFilters {
  preset: DatePreset
  start: string
  end: string
  trafficSourceId: string
  campaignId: string
  buyerId: string
  programId: string
  offerId: string
  leadStatus: string
}

export interface IntelligenceInput {
  tenantId: string
  leads: Lead[]
  attempts: DeliveryAttempt[]
  rejections: LeadRejection[]
  buyers: Buyer[]
  programs: Program[]
  buyerPrograms: BuyerProgram[]
  buyerCaps: BuyerCap[]
  trafficSources: TrafficSource[]
  campaigns: Campaign[]
  outcomes: LeadOutcome[]
}

export interface MetricValue { value: number | null; previous: number | null; change: number | null; changeKind: 'percent' | 'points' }
export interface FunnelStage { key: string; label: string; count: number; conversion: number | null; dropoff: number | null }
export interface TrendPoint { label: string; leads: number; accepted: number; rejected: number; acceptanceRate: number | null }
export interface SourcePerformance { sourceId: string; source: string; campaignId: string; campaign: string; leads: number; accepted: number; rejected: number; acceptanceRate: number | null; averageResponseMs: number | null; conversions: number; outcomeRevenue: number | null }
export interface BuyerScorecard { buyerId: string; buyer: string; attempted: number; accepted: number; rejected: number; acceptanceRate: number | null; averageResponseMs: number | null; cap: number; delivered: number; remaining: number; utilization: number | null; capacityStatus: CapacityStatus; topRejectionReason: string; revenue: number | null; qualifiedOutcomes: number; applicationsSales: number; conversions: number; startsCompletions: number; outcomeRevenue: number | null; revenuePerLead: number | null }
export interface ProgramPerformance { programId: string; program: string; leads: number; attempts: number; accepted: number; rejected: number; acceptanceRate: number | null; activeBuyers: number; remainingCapacity: number; topRejectionReason: string; revenue: number | null; conversions: number; outcomeRevenue: number | null }
export interface CategoryMetric { key: string; label: string; count: number; recoverable: number }
export interface NamedMetric { id: string; label: string; count: number }
export type CapacityStatus = 'healthy' | 'approaching_cap' | 'at_cap' | 'inactive' | 'unconfigured'

export interface IntelligenceReport {
  tenantId: string
  range: { start: string; end: string; previousStart: string; previousEnd: string }
  kpis: {
    totalLeads: MetricValue; acceptedLeads: MetricValue; rejectedLeads: MetricValue
    acceptanceRate: MetricValue; rejectionRate: MetricValue; recoveryOpportunity: MetricValue
    averageResponseMs: MetricValue; timeoutRate: MetricValue; activeBuyers: MetricValue; capacityUtilization: MetricValue
    estimatedRevenue: MetricValue
  }
  funnel: FunnelStage[]
  trends: TrendPoint[]
  sources: SourcePerformance[]
  buyers: BuyerScorecard[]
  programs: ProgramPerformance[]
  rejectionCategories: CategoryMetric[]
  rejectionBuyers: NamedMetric[]
  rejectionPrograms: NamedMetric[]
  recoverableSources: NamedMetric[]
  recoverablePrograms: NamedMetric[]
  outcomes: { contacted: MetricValue; qualified: MetricValue; applicationsSales: MetricValue; conversions: MetricValue; startsCompletions: MetricValue; revenue: MetricValue; revenuePerLead: MetricValue; revenuePerAcceptedLead: MetricValue; funnel: FunnelStage[] }
  dataQuality: { missingSource: number; missingCampaign: number; missingProgram: number; missingResponseTime: number; unknownRejectionReason: number }
}

const DAY = 86_400_000
const emptyMetric = (kind: MetricValue['changeKind'] = 'percent'): MetricValue => ({ value: null, previous: null, change: null, changeKind: kind })
const ratio = (part: number, total: number) => total ? (part / total) * 100 : null
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const round = (value: number | null, digits = 1) => value == null ? null : Number(value.toFixed(digits))

export function metric(value: number | null, previous: number | null, changeKind: MetricValue['changeKind'] = 'percent'): MetricValue {
  const change = value == null || previous == null
    ? null
    : changeKind === 'points'
      ? value - previous
      : previous === 0 ? null : ((value - previous) / Math.abs(previous)) * 100
  return { value: round(value), previous: round(previous), change: round(change), changeKind }
}

export function capacityUtilization(delivered: number, limit: number) { return limit > 0 ? round((delivered / limit) * 100) : null }
export function capacityStatus(utilization: number | null, active = true): CapacityStatus {
  if (!active) return 'inactive'
  if (utilization == null) return 'unconfigured'
  if (utilization >= 100) return 'at_cap'
  if (utilization >= 85) return 'approaching_cap'
  return 'healthy'
}

export function dateRangeForPreset(preset: DatePreset, now = new Date(), custom?: { start: string; end: string }) {
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  let start = new Date(dayStart); let end = new Date(now)
  if (preset === 'yesterday') { start = new Date(dayStart.getTime() - DAY); end = new Date(dayStart.getTime() - 1) }
  if (preset === 'last_7_days') start = new Date(dayStart.getTime() - 6 * DAY)
  if (preset === 'last_30_days') start = new Date(dayStart.getTime() - 29 * DAY)
  if (preset === 'this_month') start = new Date(now.getFullYear(), now.getMonth(), 1)
  if (preset === 'last_month') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, -1) }
  if (preset === 'custom' && custom) { start = new Date(`${custom.start}T00:00:00`); end = new Date(`${custom.end}T23:59:59.999`) }
  const duration = Math.max(DAY, end.getTime() - start.getTime() + 1)
  return { start: start.toISOString(), end: end.toISOString(), previousStart: new Date(start.getTime() - duration).toISOString(), previousEnd: new Date(start.getTime() - 1).toISOString() }
}

export function defaultIntelligenceFilters(now = new Date()): IntelligenceFilters {
  const range = dateRangeForPreset('last_30_days', now)
  return { preset: 'last_30_days', start: range.start.slice(0, 10), end: range.end.slice(0, 10), trafficSourceId: '', campaignId: '', buyerId: '', programId: '', offerId: '', leadStatus: '' }
}

const normalizeCategory = (value: string) => value.trim().toLowerCase() || 'unknown'
const title = (value: string) => value === 'unknown' ? 'Unknown / Unclassified' : value.split(/[_\s-]+/).map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ')

export function calculateIntelligence(input: IntelligenceInput, filters: IntelligenceFilters, now = new Date()): IntelligenceReport {
  const range = filters.preset === 'custom' ? dateRangeForPreset('custom', now, { start: filters.start, end: filters.end }) : dateRangeForPreset(filters.preset, now)
  const tenantLeads = input.leads.filter((row) => row.tenantId === input.tenantId)
  const tenantAttempts = input.attempts.filter((row) => row.tenantId === input.tenantId)
  const tenantRejections = input.rejections.filter((row) => row.tenantId === input.tenantId)
  const tenantBuyers = input.buyers.filter((row) => row.tenantId === input.tenantId)
  const tenantPrograms = input.programs.filter((row) => row.tenantId === input.tenantId)
  const tenantSources = input.trafficSources.filter((row) => row.tenantId === input.tenantId)
  const tenantCampaigns = input.campaigns.filter((row) => row.tenantId === input.tenantId)
  const inRange = (value: string, start = range.start, end = range.end) => value >= start && value <= end
  const matchesDimensions = (lead: Lead) => (!filters.trafficSourceId || lead.trafficSourceId === filters.trafficSourceId) && (!filters.campaignId || lead.campaignId === filters.campaignId) && (!filters.programId || lead.programId === filters.programId) && (!filters.offerId || lead.offerId === filters.offerId) && (!filters.leadStatus || lead.status === filters.leadStatus)
  const matchesBuyer = (lead: Lead) => !filters.buyerId || tenantAttempts.some((attempt) => attempt.leadId === lead.id && attempt.buyerId === filters.buyerId)
  const currentLeads = tenantLeads.filter((lead) => inRange(lead.receivedAt) && matchesDimensions(lead) && matchesBuyer(lead))
  const previousLeads = tenantLeads.filter((lead) => inRange(lead.receivedAt, range.previousStart, range.previousEnd) && matchesDimensions(lead) && matchesBuyer(lead))
  const currentIds = new Set(currentLeads.map((lead) => lead.id)); const previousIds = new Set(previousLeads.map((lead) => lead.id))
  const currentAttempts = tenantAttempts.filter((attempt) => currentIds.has(attempt.leadId) && (!filters.buyerId || attempt.buyerId === filters.buyerId))
  const previousAttempts = tenantAttempts.filter((attempt) => previousIds.has(attempt.leadId) && (!filters.buyerId || attempt.buyerId === filters.buyerId))
  const currentRejections = tenantRejections.filter((rejection) => currentIds.has(rejection.leadId) && (!filters.buyerId || rejection.buyerId === filters.buyerId))
  const previousRejections = tenantRejections.filter((rejection) => previousIds.has(rejection.leadId) && (!filters.buyerId || rejection.buyerId === filters.buyerId))
  const tenantOutcomes = input.outcomes.filter((row) => row.tenantId === input.tenantId)
  const currentOutcomes = tenantOutcomes.filter((row) => currentIds.has(row.leadId) && row.occurredAt <= range.end && (!filters.buyerId || row.buyerId === filters.buyerId))
  const previousOutcomes = tenantOutcomes.filter((row) => previousIds.has(row.leadId) && row.occurredAt <= range.previousEnd && (!filters.buyerId || row.buyerId === filters.buyerId))
  const outcomeLeadCount = (rows: LeadOutcome[],types: LeadOutcome['outcomeType'][]) => new Set(rows.filter((row) => types.includes(row.outcomeType)).map((row) => row.leadId)).size
  const outcomeRevenue = (rows: LeadOutcome[]) => rows.filter((row) => row.monetaryValue != null).reduce((sum,row) => sum+(row.monetaryValue ?? 0),0)

  const accepted = (rows: Lead[]) => rows.filter((lead) => lead.status === 'accepted' || lead.status === 'recovered').length
  const rejected = (rows: Lead[]) => rows.filter((lead) => lead.status === 'rejected').length
  const timed = (rows: DeliveryAttempt[]) => rows.flatMap((attempt) => attempt.responseTimeMs == null ? [] : [attempt.responseTimeMs])
  const revenue = (rows: DeliveryAttempt[]) => rows.filter((attempt) => attempt.status === 'accepted' && attempt.payout != null).reduce((sum, attempt) => sum + (attempt.payout ?? 0), 0)
  const revenueAvailable = currentAttempts.some((attempt) => attempt.status === 'accepted' && attempt.payout != null)
  const capRows = input.buyerCaps.filter((cap) => cap.tenantId === input.tenantId && (!filters.buyerId || cap.buyerId === filters.buyerId) && (!filters.programId || cap.programId === filters.programId))
  const capLimit = capRows.filter((cap) => cap.status === 'active').reduce((sum, cap) => sum + cap.limit, 0)
  const capDelivered = capRows.filter((cap) => cap.status === 'active').reduce((sum, cap) => sum + cap.delivered, 0)
  const kpis = {
    totalLeads: metric(currentLeads.length, previousLeads.length), acceptedLeads: metric(accepted(currentLeads), accepted(previousLeads)), rejectedLeads: metric(rejected(currentLeads), rejected(previousLeads)),
    acceptanceRate: metric(ratio(accepted(currentLeads), currentLeads.length), ratio(accepted(previousLeads), previousLeads.length), 'points'),
    rejectionRate: metric(ratio(rejected(currentLeads), currentLeads.length), ratio(rejected(previousLeads), previousLeads.length), 'points'),
    recoveryOpportunity: metric(currentRejections.filter((row) => row.recoverable).length, previousRejections.filter((row) => row.recoverable).length),
    averageResponseMs: metric(average(timed(currentAttempts)), average(timed(previousAttempts))),
    timeoutRate: metric(ratio(currentAttempts.filter((row) => row.status === 'timeout').length, currentAttempts.length), ratio(previousAttempts.filter((row) => row.status === 'timeout').length, previousAttempts.length), 'points'),
    activeBuyers: metric(tenantBuyers.filter((row) => row.status === 'active').length, tenantBuyers.filter((row) => row.status === 'active').length),
    capacityUtilization: metric(capacityUtilization(capDelivered, capLimit), null, 'points'),
    estimatedRevenue: revenueAvailable ? metric(revenue(currentAttempts), revenue(previousAttempts)) : emptyMetric(),
  }

  const validated = currentLeads.filter((lead) => ['validated','queued','delivering','accepted','rejected','recovered','closed'].includes(lead.status)).length
  const attemptedIds = new Set(currentAttempts.map((attempt) => attempt.leadId))
  const funnelCounts = [currentLeads.length, validated, attemptedIds.size, accepted(currentLeads), rejected(currentLeads)]
  const funnel: FunnelStage[] = ['Leads Received','Validated','Delivery Attempted','Accepted','Rejected / Unmatched'].map((label, index) => ({ key: label.toLowerCase().replace(/\W+/g, '_'), label, count: funnelCounts[index], conversion: ratio(funnelCounts[index], funnelCounts[0]), dropoff: index ? ratio(Math.max(0, funnelCounts[index - 1] - funnelCounts[index]), funnelCounts[index - 1]) : null }))

  const trendMap = new Map<string, TrendPoint>()
  for (const lead of currentLeads) { const key = lead.receivedAt.slice(0, 10); const row = trendMap.get(key) ?? { label: key, leads: 0, accepted: 0, rejected: 0, acceptanceRate: null }; row.leads++; if (lead.status === 'accepted' || lead.status === 'recovered') row.accepted++; if (lead.status === 'rejected') row.rejected++; row.acceptanceRate = ratio(row.accepted, row.leads); trendMap.set(key, row) }
  const trends = [...trendMap.values()].sort((a, b) => a.label.localeCompare(b.label))

  const sources: SourcePerformance[] = []
  const sourceKeys = new Set(currentLeads.map((lead) => `${lead.trafficSourceId ?? ''}|${lead.campaignId ?? ''}`))
  for (const key of sourceKeys) { const [sourceId, campaignId] = key.split('|'); const rows = currentLeads.filter((lead) => (lead.trafficSourceId ?? '') === sourceId && (lead.campaignId ?? '') === campaignId); const ids = new Set(rows.map((lead) => lead.id)); const attempts = currentAttempts.filter((attempt) => ids.has(attempt.leadId)); const outcomes=currentOutcomes.filter((outcome) => ids.has(outcome.leadId)); const economic=outcomes.some((outcome) => outcome.monetaryValue != null); sources.push({ sourceId, source: tenantSources.find((row) => row.id === sourceId)?.name ?? 'Unknown / Unclassified', campaignId, campaign: tenantCampaigns.find((row) => row.id === campaignId)?.name ?? 'Unknown / Unclassified', leads: rows.length, accepted: accepted(rows), rejected: rejected(rows), acceptanceRate: round(ratio(accepted(rows), rows.length)), averageResponseMs: round(average(timed(attempts)), 0),conversions:outcomeLeadCount(outcomes,['enrollment','sale','completed']),outcomeRevenue:economic ? outcomeRevenue(outcomes) : null }) }

  const topCategory = (rows: LeadRejection[]) => { const counts = new Map<string, number>(); for (const row of rows) { const key = normalizeCategory(row.category); counts.set(key, (counts.get(key) ?? 0) + 1) } return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown' }
  const buyers: BuyerScorecard[] = tenantBuyers.filter((buyer) => !filters.buyerId || buyer.id === filters.buyerId).map((buyer) => { const attempts = currentAttempts.filter((row) => row.buyerId === buyer.id); const rejections = currentRejections.filter((row) => row.buyerId === buyer.id); const outcomes=currentOutcomes.filter((row) => row.buyerId===buyer.id); const caps = capRows.filter((row) => row.buyerId === buyer.id); const limit = caps.reduce((sum, row) => sum + row.limit, 0); const delivered = caps.reduce((sum, row) => sum + row.delivered, 0); const utilization = capacityUtilization(delivered, limit); const hasRevenue = attempts.some((row) => row.status === 'accepted' && row.payout != null); const economic=outcomes.some((row) => row.monetaryValue != null); const deliveredLeads=new Set(attempts.map((row) => row.leadId)).size; const outcomeValue=economic ? outcomeRevenue(outcomes) : null; return { buyerId: buyer.id, buyer: buyer.name, attempted: attempts.length, accepted: attempts.filter((row) => row.status === 'accepted').length, rejected: attempts.filter((row) => row.status === 'rejected').length, acceptanceRate: round(ratio(attempts.filter((row) => row.status === 'accepted').length, attempts.length)), averageResponseMs: round(average(timed(attempts)), 0), cap: limit, delivered, remaining: Math.max(0, limit - delivered), utilization, capacityStatus: capacityStatus(utilization, buyer.status === 'active'), topRejectionReason: title(topCategory(rejections)), revenue: hasRevenue ? revenue(attempts) : null,qualifiedOutcomes:outcomeLeadCount(outcomes,['qualified']),applicationsSales:outcomeLeadCount(outcomes,['application','sale']),conversions:outcomeLeadCount(outcomes,['enrollment','sale']),startsCompletions:outcomeLeadCount(outcomes,['start','completed']),outcomeRevenue:outcomeValue,revenuePerLead:outcomeValue != null && deliveredLeads ? round(outcomeValue/deliveredLeads) : null } }).sort((a, b) => b.attempted - a.attempted)

  const programs: ProgramPerformance[] = tenantPrograms.filter((program) => !filters.programId || program.id === filters.programId).map((program) => { const rows = currentLeads.filter((lead) => lead.programId === program.id); const ids = new Set(rows.map((lead) => lead.id)); const attempts = currentAttempts.filter((row) => row.programId === program.id || ids.has(row.leadId)); const rejections = currentRejections.filter((row) => ids.has(row.leadId)); const outcomes=currentOutcomes.filter((row) => ids.has(row.leadId)); const mappings = input.buyerPrograms.filter((row) => row.tenantId === input.tenantId && row.programId === program.id && row.status === 'active'); const caps = capRows.filter((row) => row.programId === program.id); const hasRevenue = attempts.some((row) => row.status === 'accepted' && row.payout != null); const economic=outcomes.some((row) => row.monetaryValue != null); return { programId: program.id, program: program.name, leads: rows.length, attempts: attempts.length, accepted: attempts.filter((row) => row.status === 'accepted').length, rejected: attempts.filter((row) => row.status === 'rejected').length, acceptanceRate: round(ratio(attempts.filter((row) => row.status === 'accepted').length, attempts.length)), activeBuyers: new Set(mappings.map((row) => row.buyerId)).size, remainingCapacity: caps.reduce((sum, row) => sum + Math.max(0, row.limit - row.delivered), 0), topRejectionReason: title(topCategory(rejections)), revenue: hasRevenue ? revenue(attempts) : null,conversions:outcomeLeadCount(outcomes,['enrollment','sale']),outcomeRevenue:economic ? outcomeRevenue(outcomes) : null } }).sort((a, b) => b.leads - a.leads)

  const categories = new Map<string, CategoryMetric>(); for (const row of currentRejections) { const key = normalizeCategory(row.category); const item = categories.get(key) ?? { key, label: title(key), count: 0, recoverable: 0 }; item.count++; if (row.recoverable) item.recoverable++; categories.set(key, item) }
  const namedCounts = (rows: LeadRejection[], dimension: 'buyer' | 'program', recoverableOnly = false): NamedMetric[] => { const counts = new Map<string, number>(); for (const row of rows.filter((item) => !recoverableOnly || item.recoverable)) { const attempt = tenantAttempts.find((item) => item.id === row.deliveryAttemptId); const id = dimension === 'buyer' ? row.buyerId : attempt?.programId ?? ''; const label = dimension === 'buyer' ? tenantBuyers.find((item) => item.id === id)?.name : tenantPrograms.find((item) => item.id === id)?.name; const key = `${id}|${label ?? 'Unknown / Unclassified'}`; counts.set(key, (counts.get(key) ?? 0) + 1) } return [...counts.entries()].map(([key, count]) => { const [id, label] = key.split('|'); return { id, label, count } }).sort((a, b) => b.count - a.count) }
  const sourceCounts = new Map<string, number>(); for (const rejection of currentRejections.filter((row) => row.recoverable)) { const lead = tenantLeads.find((row) => row.id === rejection.leadId); const id = lead?.trafficSourceId ?? ''; const label = tenantSources.find((row) => row.id === id)?.name ?? 'Unknown / Unclassified'; sourceCounts.set(`${id}|${label}`, (sourceCounts.get(`${id}|${label}`) ?? 0) + 1) }
  const recoverableSources = [...sourceCounts.entries()].map(([key, count]) => { const [id, label] = key.split('|'); return { id, label, count } }).sort((a, b) => b.count - a.count)

  const outcomeMetric=(types: LeadOutcome['outcomeType'][]) => metric(outcomeLeadCount(currentOutcomes,types),outcomeLeadCount(previousOutcomes,types))
  const outcomeRevenueCurrent=currentOutcomes.some((row) => row.monetaryValue != null) ? outcomeRevenue(currentOutcomes) : null; const outcomeRevenuePrevious=previousOutcomes.some((row) => row.monetaryValue != null) ? outcomeRevenue(previousOutcomes) : null
  const outcomeStages=[{ key:'accepted',label:'Accepted Leads',count:accepted(currentLeads) },{ key:'contacted',label:'Contacted',count:outcomeLeadCount(currentOutcomes,['contacted']) },{ key:'qualified',label:'Qualified Outcomes',count:outcomeLeadCount(currentOutcomes,['qualified']) },{ key:'applications_sales',label:'Applications / Sales',count:outcomeLeadCount(currentOutcomes,['application','sale']) },{ key:'conversions',label:'Conversions',count:outcomeLeadCount(currentOutcomes,['enrollment','sale']) },{ key:'starts_completions',label:'Starts / Completions',count:outcomeLeadCount(currentOutcomes,['start','completed']) }]
  const outcomeFunnel=outcomeStages.map((stage,index) => ({ ...stage,conversion:ratio(stage.count,currentLeads.length),dropoff:index ? ratio(Math.max(0,outcomeStages[index-1].count-stage.count),outcomeStages[index-1].count) : null }))
  return { tenantId: input.tenantId, range, kpis, funnel, trends, sources: sources.sort((a, b) => b.leads - a.leads), buyers, programs, rejectionCategories: [...categories.values()].sort((a, b) => b.count - a.count), rejectionBuyers: namedCounts(currentRejections, 'buyer'), rejectionPrograms: namedCounts(currentRejections, 'program'), recoverableSources, recoverablePrograms: namedCounts(currentRejections, 'program', true),outcomes:{ contacted:outcomeMetric(['contacted']),qualified:outcomeMetric(['qualified']),applicationsSales:outcomeMetric(['application','sale']),conversions:outcomeMetric(['enrollment','sale']),startsCompletions:outcomeMetric(['start','completed']),revenue:metric(outcomeRevenueCurrent,outcomeRevenuePrevious),revenuePerLead:metric(outcomeRevenueCurrent != null && currentLeads.length ? outcomeRevenueCurrent/currentLeads.length : null,outcomeRevenuePrevious != null && previousLeads.length ? outcomeRevenuePrevious/previousLeads.length : null),revenuePerAcceptedLead:metric(outcomeRevenueCurrent != null && accepted(currentLeads) ? outcomeRevenueCurrent/accepted(currentLeads) : null,outcomeRevenuePrevious != null && accepted(previousLeads) ? outcomeRevenuePrevious/accepted(previousLeads) : null),funnel:outcomeFunnel}, dataQuality: { missingSource: currentLeads.filter((row) => !row.trafficSourceId).length, missingCampaign: currentLeads.filter((row) => !row.campaignId).length, missingProgram: currentLeads.filter((row) => !row.programId).length, missingResponseTime: currentAttempts.filter((row) => row.responseTimeMs == null).length, unknownRejectionReason: currentRejections.filter((row) => !row.category.trim()).length } }
}
