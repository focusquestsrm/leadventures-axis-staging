import type { BuyerCap, BuyerProgram, BuyerRule, Campaign, DeliveryAttempt, LeadDelivery, LeadIdentity, LeadRejection, LeadStatusEvent, TrafficSource } from '../types'

const tenantId = '10000000-0000-4000-8000-000000000001'

export const release2Demo: {
  trafficSources: TrafficSource[]
  campaigns: Campaign[]
  buyerPrograms: BuyerProgram[]
  buyerRules: BuyerRule[]
  buyerCaps: BuyerCap[]
  leadDeliveries: LeadDelivery[]
  deliveryAttempts: DeliveryAttempt[]
  leadRejections: LeadRejection[]
  leadStatusHistory: LeadStatusEvent[]
  leadIdentities: LeadIdentity[]
} = {
  trafficSources: [
    { id: 'ts1', tenantId, name: 'Meta', sourceType: 'meta', externalId: 'src-meta-demo', status: 'active', notes: 'Synthetic paid social source.' },
    { id: 'ts2', tenantId, name: 'Google', sourceType: 'google', externalId: 'src-google-demo', status: 'active', notes: 'Synthetic paid search source.' },
  ],
  campaigns: [
    { id: 'c1', tenantId, trafficSourceId: 'ts1', name: 'Healthcare Careers', externalId: 'cmp-health-demo', status: 'active', campaignType: 'lead_generation', startDate: '2026-08-01', endDate: null },
    { id: 'c2', tenantId, trafficSourceId: 'ts2', name: 'Psychology Programs', externalId: 'cmp-psych-demo', status: 'active', campaignType: 'search', startDate: '2026-08-05', endDate: null },
  ],
  buyerPrograms: [
    { id: 'bp1', tenantId, buyerId: 'b1', programId: 'p1', status: 'active', payout: 62, priority: 10 },
    { id: 'bp2', tenantId, buyerId: 'b2', programId: 'p2', status: 'active', payout: 58, priority: 20 },
    { id: 'bp3', tenantId, buyerId: 'b3', programId: 'p1', status: 'active', payout: 54, priority: 30 },
    { id: 'bp4', tenantId, buyerId: 'b3', programId: 'p3', status: 'active', payout: 48, priority: 40 },
  ],
  buyerRules: [
    { id: 'br1', tenantId, buyerId: 'b1', ruleType: 'state', operator: 'in', value: 'FL, GA, NC', status: 'active', priority: 10 },
    { id: 'br2', tenantId, buyerId: 'b2', ruleType: 'program', operator: 'in', value: 'Pharmacy Technician', status: 'active', priority: 10 },
  ],
  buyerCaps: [
    { id: 'bc1', tenantId, buyerId: 'b1', programId: 'p1', capType: 'monthly', periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-09-01T00:00:00.000Z', limit: 1200, delivered: 1188, status: 'active' },
    { id: 'bc2', tenantId, buyerId: 'b2', programId: 'p2', capType: 'daily', periodStart: '2026-08-16T00:00:00.000Z', periodEnd: '2026-08-17T00:00:00.000Z', limit: 90, delivered: 54, status: 'active' },
    { id: 'bc3', tenantId, buyerId: 'b3', programId: null, capType: 'weekly', periodStart: '2026-08-11T00:00:00.000Z', periodEnd: '2026-08-18T00:00:00.000Z', limit: 350, delivered: 214, status: 'active' },
  ],
  leadDeliveries: [
    { id: 'ld1', tenantId, leadId: 'l1', status: 'accepted', startedAt: '2026-08-16T13:43:00.000Z', completedAt: '2026-08-16T13:43:04.000Z', createdAt: '2026-08-16T13:43:00.000Z' },
    { id: 'ld2', tenantId, leadId: 'l2', status: 'exhausted', startedAt: '2026-08-16T13:19:00.000Z', completedAt: '2026-08-16T13:19:07.000Z', createdAt: '2026-08-16T13:19:00.000Z' },
    { id: 'ld3', tenantId, leadId: 'l3', status: 'error', startedAt: '2026-08-16T12:56:00.000Z', completedAt: '2026-08-16T12:56:30.000Z', createdAt: '2026-08-16T12:56:00.000Z' },
  ],
  deliveryAttempts: [
    { id: 'da1', tenantId, deliveryId: 'ld1', leadId: 'l1', buyerId: 'b1', offerId: 'o1', programId: 'p1', attemptNumber: 1, deliveryMethod: 'ping_post', status: 'rejected', requestStartedAt: '2026-08-16T13:43:00.000Z', responseReceivedAt: '2026-08-16T13:43:01.000Z', responseTimeMs: 842, externalReference: 'SYN-ATT-001', payout: null, createdAt: '2026-08-16T13:43:00.000Z' },
    { id: 'da2', tenantId, deliveryId: 'ld1', leadId: 'l1', buyerId: 'b2', offerId: 'o1', programId: 'p1', attemptNumber: 2, deliveryMethod: 'host_post', status: 'accepted', requestStartedAt: '2026-08-16T13:43:02.000Z', responseReceivedAt: '2026-08-16T13:43:04.000Z', responseTimeMs: 1640, externalReference: 'SYN-ATT-002', payout: 58, createdAt: '2026-08-16T13:43:02.000Z' },
    { id: 'da3', tenantId, deliveryId: 'ld2', leadId: 'l2', buyerId: 'b1', offerId: 'o2', programId: 'p2', attemptNumber: 1, deliveryMethod: 'ping_post', status: 'rejected', requestStartedAt: '2026-08-16T13:19:00.000Z', responseReceivedAt: '2026-08-16T13:19:01.000Z', responseTimeMs: 620, externalReference: 'SYN-ATT-003', payout: null, createdAt: '2026-08-16T13:19:00.000Z' },
    { id: 'da4', tenantId, deliveryId: 'ld2', leadId: 'l2', buyerId: 'b3', offerId: 'o2', programId: 'p2', attemptNumber: 2, deliveryMethod: 'host_post', status: 'rejected', requestStartedAt: '2026-08-16T13:19:03.000Z', responseReceivedAt: '2026-08-16T13:19:07.000Z', responseTimeMs: 3880, externalReference: 'SYN-ATT-004', payout: null, createdAt: '2026-08-16T13:19:03.000Z' },
    { id: 'da5', tenantId, deliveryId: 'ld3', leadId: 'l3', buyerId: 'b3', offerId: 'o3', programId: 'p3', attemptNumber: 1, deliveryMethod: 'host_post', status: 'timeout', requestStartedAt: '2026-08-16T12:56:00.000Z', responseReceivedAt: null, responseTimeMs: 30000, externalReference: 'SYN-ATT-005', payout: null, createdAt: '2026-08-16T12:56:00.000Z' },
  ],
  leadRejections: [
    { id: 'lr1', tenantId, leadId: 'l1', deliveryAttemptId: 'da1', buyerId: 'b1', rejectionCode: 'CAP_MONTHLY', category: 'cap', reason: 'Monthly allocation reached', recoverable: true, createdAt: '2026-08-16T13:43:01.000Z' },
    { id: 'lr2', tenantId, leadId: 'l2', deliveryAttemptId: 'da3', buyerId: 'b1', rejectionCode: 'GEO_OUTSIDE', category: 'geography', reason: 'Region outside current eligibility', recoverable: true, createdAt: '2026-08-16T13:19:01.000Z' },
    { id: 'lr3', tenantId, leadId: 'l2', deliveryAttemptId: 'da4', buyerId: 'b3', rejectionCode: 'PROGRAM_PAUSED', category: 'program', reason: 'Program allocation paused', recoverable: false, createdAt: '2026-08-16T13:19:07.000Z' },
  ],
  leadStatusHistory: [
    { id: 'sh1', tenantId, leadId: 'l1', fromStatus: null, toStatus: 'new', reason: 'Lead received', changedBy: null, createdAt: '2026-08-16T13:42:00.000Z' },
    { id: 'sh2', tenantId, leadId: 'l1', fromStatus: 'new', toStatus: 'validated', reason: 'Operational validation passed', changedBy: null, createdAt: '2026-08-16T13:42:18.000Z' },
    { id: 'sh3', tenantId, leadId: 'l1', fromStatus: 'validated', toStatus: 'delivering', reason: 'Delivery sequence started', changedBy: null, createdAt: '2026-08-16T13:43:00.000Z' },
    { id: 'sh4', tenantId, leadId: 'l1', fromStatus: 'delivering', toStatus: 'accepted', reason: 'Accepted by secondary buyer', changedBy: null, createdAt: '2026-08-16T13:43:04.000Z' },
    { id: 'sh5', tenantId, leadId: 'l2', fromStatus: null, toStatus: 'new', reason: 'Lead received', changedBy: null, createdAt: '2026-08-16T13:18:00.000Z' },
    { id: 'sh6', tenantId, leadId: 'l2', fromStatus: 'new', toStatus: 'rejected', reason: 'Eligible buyers exhausted', changedBy: null, createdAt: '2026-08-16T13:19:07.000Z' },
  ],
  leadIdentities: [
    { leadId: 'l1', tenantId, displayName: 'Demo Person One', email: 'demo.one@example.com', phone: '+1 ••• ••• 0101', masked: true },
    { leadId: 'l2', tenantId, displayName: 'Demo Person Two', email: 'demo.two@example.com', phone: '+1 ••• ••• 0102', masked: true },
  ],
}
