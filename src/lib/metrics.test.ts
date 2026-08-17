import { describe, expect, it } from 'vitest'
import { calculateIntelligence, capacityStatus, capacityUtilization, defaultIntelligenceFilters, metric, type IntelligenceInput } from './metrics'

const tenantA = 'tenant-a'; const tenantB = 'tenant-b'; const now = new Date('2026-08-16T18:00:00.000Z')
const input: IntelligenceInput = {
  tenantId: tenantA,
  leads: [
    { id:'l1',tenantId:tenantA,reference:'A-1',externalLeadId:'',trafficSourceId:'s1',campaignId:'c1',programId:'p1',offerId:'o1',program:'Program A',source:'Source A',campaign:'Campaign A',offer:'Offer A',status:'accepted',score:90,receivedAt:'2026-08-16T12:00:00.000Z',createdAt:'2026-08-16T12:00:00.000Z' },
    { id:'l2',tenantId:tenantA,reference:'A-2',externalLeadId:'',trafficSourceId:null,campaignId:null,programId:null,offerId:null,program:'Unassigned',source:'Unknown',campaign:'Unassigned',offer:'Unassigned',status:'rejected',score:50,receivedAt:'2026-08-16T13:00:00.000Z',createdAt:'2026-08-16T13:00:00.000Z' },
    { id:'lp',tenantId:tenantA,reference:'A-P',externalLeadId:'',trafficSourceId:'s1',campaignId:'c1',programId:'p1',offerId:'o1',program:'Program A',source:'Source A',campaign:'Campaign A',offer:'Offer A',status:'accepted',score:80,receivedAt:'2026-07-16T12:00:00.000Z',createdAt:'2026-07-16T12:00:00.000Z' },
    { id:'other',tenantId:tenantB,reference:'PRIVATE',externalLeadId:'',trafficSourceId:'private-source',campaignId:null,programId:null,offerId:null,program:'Private Program',source:'Private Source',campaign:'',offer:'',status:'accepted',score:100,receivedAt:'2026-08-16T12:00:00.000Z',createdAt:'2026-08-16T12:00:00.000Z' },
  ],
  attempts: [
    { id:'a1',tenantId:tenantA,deliveryId:'d1',leadId:'l1',buyerId:'b1',offerId:'o1',programId:'p1',attemptNumber:1,deliveryMethod:'post',status:'accepted',requestStartedAt:null,responseReceivedAt:null,responseTimeMs:500,externalReference:'',payout:75,createdAt:'2026-08-16T12:00:00.000Z' },
    { id:'a2',tenantId:tenantA,deliveryId:'d2',leadId:'l2',buyerId:'b1',offerId:null,programId:null,attemptNumber:1,deliveryMethod:'post',status:'timeout',requestStartedAt:null,responseReceivedAt:null,responseTimeMs:1500,externalReference:'',payout:null,createdAt:'2026-08-16T13:00:00.000Z' },
    { id:'ao',tenantId:tenantB,deliveryId:'do',leadId:'other',buyerId:'private-buyer',offerId:null,programId:null,attemptNumber:1,deliveryMethod:'post',status:'accepted',requestStartedAt:null,responseReceivedAt:null,responseTimeMs:1,externalReference:'',payout:999,createdAt:'2026-08-16T12:00:00.000Z' },
  ],
  rejections: [{ id:'r1',tenantId:tenantA,leadId:'l2',deliveryAttemptId:'a2',buyerId:'b1',rejectionCode:'CAP',category:'',reason:'',recoverable:true,createdAt:'2026-08-16T13:00:00.000Z' }],
  buyers: [{ id:'b1',tenantId:tenantA,name:'Buyer A',externalReference:'',notes:'',status:'active',buyerType:'education',deliveryMethod:'post',defaultPayout:50,currency:'USD',duplicateWindowDays:30,exclusive:false,timezone:'UTC',offers:1,updatedAt:'2026-08-16T00:00:00.000Z' },{ id:'private-buyer',tenantId:tenantB,name:'Private Buyer',externalReference:'',notes:'',status:'active',buyerType:'education',deliveryMethod:'post',defaultPayout:50,currency:'USD',duplicateWindowDays:30,exclusive:false,timezone:'UTC',offers:1,updatedAt:'2026-08-16T00:00:00.000Z' }],
  programs: [{ id:'p1',tenantId:tenantA,name:'Program A',code:'PA',category:'Test',status:'active' },{ id:'private-program',tenantId:tenantB,name:'Private Program',code:'PP',category:'Test',status:'active' }],
  buyerPrograms: [{ id:'bp1',tenantId:tenantA,buyerId:'b1',programId:'p1',status:'active',payout:50,priority:1 }],
  buyerCaps: [{ id:'cap1',tenantId:tenantA,buyerId:'b1',programId:'p1',capType:'daily',periodStart:'2026-08-16',periodEnd:'2026-08-17',limit:100,delivered:90,status:'active' }],
  trafficSources: [{ id:'s1',tenantId:tenantA,name:'Source A',sourceType:'paid',externalId:'',status:'active',notes:'' },{ id:'private-source',tenantId:tenantB,name:'Private Source',sourceType:'paid',externalId:'',status:'active',notes:'' }],
  campaigns: [{ id:'c1',tenantId:tenantA,trafficSourceId:'s1',name:'Campaign A',externalId:'',status:'active',campaignType:'paid',startDate:null,endDate:null }],
  outcomes: [],
}

const report = () => calculateIntelligence(input, defaultIntelligenceFilters(now), now)

describe('Release 3 metric definitions', () => {
  it('calculates acceptance rate from selected-period leads', () => expect(report().kpis.acceptanceRate.value).toBe(50))
  it('calculates rejection rate from selected-period leads', () => expect(report().kpis.rejectionRate.value).toBe(50))
  it('counts only structured recoverable rejections as recovery opportunity', () => expect(report().kpis.recoveryOpportunity.value).toBe(1))
  it('calculates capacity utilization and thresholds consistently', () => { expect(capacityUtilization(90,100)).toBe(90); expect(capacityStatus(90)).toBe('approaching_cap'); expect(capacityStatus(100)).toBe('at_cap') })
  it('uses actual response-time values for the average', () => expect(report().kpis.averageResponseMs.value).toBe(1000))
  it('calculates timeout rate across delivery attempts', () => expect(report().kpis.timeoutRate.value).toBe(50))
  it('distinguishes relative comparison from percentage-point comparison', () => { expect(metric(60,50,'points').change).toBe(10); expect(metric(60,50,'percent').change).toBe(20) })
  it('isolates aggregate counts by tenant', () => expect(report().kpis.totalLeads.value).toBe(2))
  it('isolates source filter values and grouped labels by tenant', () => expect(JSON.stringify(report().sources)).not.toContain('Private'))
  it('isolates buyer and program drill-down dimensions by tenant', () => { expect(report().buyers.map((row) => row.buyer)).toEqual(['Buyer A']); expect(report().programs.map((row) => row.program)).toEqual(['Program A']) })
  it('returns a valid empty-tenant report', () => { const empty = calculateIntelligence({ ...input, tenantId:'empty' },defaultIntelligenceFilters(now),now); expect(empty.kpis.totalLeads.value).toBe(0); expect(empty.sources).toEqual([]) })
  it('surfaces missing and unknown data instead of silently dropping it', () => { expect(report().dataQuality.missingSource).toBe(1); expect(report().rejectionCategories[0].label).toBe('Unknown / Unclassified') })
  it('contains no mutation capability in the intelligence result', () => expect(Object.keys(report())).not.toContain('save'))
  it('omits PII fields from analytics responses', () => expect(JSON.stringify(report())).not.toMatch(/email|phone|firstName|lastName|address/i))
})

describe('Release 4 closed-loop metric definitions', () => {
  const withOutcomes = () => calculateIntelligence({ ...input,outcomes:[
    { id:'o1',tenantId:tenantA,leadId:'l1',integrationId:'crm',importBatchId:null,externalOutcomeId:'crm-1',outcomeType:'contacted',outcomeStage:'Contacted',status:'completed',occurredAt:'2026-08-16T14:00:00.000Z',monetaryValue:null,currency:'USD',programId:'p1',buyerId:'b1',sourceSystem:'Synthetic CRM',externalRecordId:'crm-1',ingestedAt:'2026-08-16T14:01:00.000Z',createdAt:'2026-08-16T14:01:00.000Z' },
    { id:'o2',tenantId:tenantA,leadId:'l1',integrationId:'crm',importBatchId:null,externalOutcomeId:'crm-2',outcomeType:'enrollment',outcomeStage:'Conversion',status:'completed',occurredAt:'2026-08-16T15:00:00.000Z',monetaryValue:1200,currency:'USD',programId:'p1',buyerId:'b1',sourceSystem:'Synthetic CRM',externalRecordId:'crm-2',ingestedAt:'2026-08-16T15:01:00.000Z',createdAt:'2026-08-16T15:01:00.000Z' },
    { id:'private-outcome',tenantId:tenantB,leadId:'other',integrationId:'private',importBatchId:null,externalOutcomeId:'private',outcomeType:'sale',outcomeStage:'Conversion',status:'completed',occurredAt:'2026-08-16T15:00:00.000Z',monetaryValue:99999,currency:'USD',programId:'private-program',buyerId:'private-buyer',sourceSystem:'Private CRM',externalRecordId:'private',ingestedAt:'2026-08-16T15:01:00.000Z',createdAt:'2026-08-16T15:01:00.000Z' },
  ] },defaultIntelligenceFilters(now),now)
  it('counts conversions by distinct matched lead', () => expect(withOutcomes().outcomes.conversions.value).toBe(1))
  it('calculates outcome revenue from explicit monetary values', () => expect(withOutcomes().outcomes.revenue.value).toBe(1200))
  it('calculates revenue per selected lead', () => expect(withOutcomes().outcomes.revenuePerLead.value).toBe(600))
  it('calculates revenue per accepted lead', () => expect(withOutcomes().outcomes.revenuePerAcceptedLead.value).toBe(1200))
  it('attributes conversions and revenue to source, buyer, and program dimensions', () => { const report=withOutcomes(); expect(report.sources[0]).toMatchObject({ conversions:1,outcomeRevenue:1200 }); expect(report.buyers[0]).toMatchObject({ conversions:1,outcomeRevenue:1200 }); expect(report.programs[0]).toMatchObject({ conversions:1,outcomeRevenue:1200 }) })
  it('isolates downstream economic outcomes by tenant', () => expect(JSON.stringify(withOutcomes())).not.toContain('99999'))
})
