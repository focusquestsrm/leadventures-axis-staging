import type { AuditEvent, Buyer, BuyerCap, BuyerProgram, BuyerRule, Campaign, DeliveryAttempt, Integration, Lead, LeadDelivery, LeadIdentity, LeadRejection, LeadStatusEvent, Membership, Offer, Program, SessionUser, Tenant, TenantRole, TenantSetting, TrafficSource } from '../types'
import { demoMode, supabase } from '../lib/supabase'
import { isTenantAssignableRole } from '../lib/rbac'
import { auditEventSelect, membershipSelect } from './queryContracts'
import { release2Demo } from '../data/release2Demo'

export interface PlatformSnapshot {
  user: SessionUser
  tenants: Tenant[]
  memberships: Membership[]
  programs: Program[]
  trafficSources: TrafficSource[]
  campaigns: Campaign[]
  leads: Lead[]
  leadIdentities: LeadIdentity[]
  buyers: Buyer[]
  offers: Offer[]
  buyerPrograms: BuyerProgram[]
  buyerRules: BuyerRule[]
  buyerCaps: BuyerCap[]
  leadDeliveries: LeadDelivery[]
  deliveryAttempts: DeliveryAttempt[]
  leadRejections: LeadRejection[]
  leadStatusHistory: LeadStatusEvent[]
  integrations: Integration[]
  tenantSettings: TenantSetting[]
  auditEvents: AuditEvent[]
}

const tenantA = '10000000-0000-4000-8000-000000000001'
const tenantB = '10000000-0000-4000-8000-000000000002'
const now = '2026-08-16T14:32:00.000Z'

const initialSnapshot: PlatformSnapshot = {
  user: { id: '20000000-0000-4000-8000-000000000001', name: 'Alex Morgan', email: 'alex.admin@example.test', isPlatformAdmin: true },
  tenants: [
    { id: tenantA, name: 'FocusQuest Demo', slug: 'focusquest-demo', status: 'active', plan: 'Growth', createdAt: '2026-07-08T10:00:00.000Z' },
    { id: tenantB, name: 'Northstar Learning Demo', slug: 'northstar-learning-demo', status: 'active', plan: 'Foundation', createdAt: '2026-08-02T10:00:00.000Z' },
  ],
  memberships: [
    { id: 'm1', tenantId: tenantA, userId: '20000000-0000-4000-8000-000000000001', name: 'Alex Morgan', email: 'alex.admin@example.test', role: 'tenant_admin', status: 'active' },
    { id: 'm2', tenantId: tenantA, userId: '20000000-0000-4000-8000-000000000002', name: 'Jordan Lee', email: 'jordan.analyst@example.test', role: 'analyst', status: 'active' },
    { id: 'm3', tenantId: tenantA, userId: '20000000-0000-4000-8000-000000000003', name: 'Sam Rivera', email: 'sam.media@example.test', role: 'media_buyer', status: 'invited' },
    { id: 'm4', tenantId: tenantB, userId: '20000000-0000-4000-8000-000000000001', name: 'Alex Morgan', email: 'alex.admin@example.test', role: 'viewer', status: 'active' },
    { id: 'm5', tenantId: tenantA, userId: '20000000-0000-4000-8000-000000000004', name: 'Taylor Chen', email: 'taylor.manager@example.test', role: 'manager', status: 'active' },
    { id: 'm6', tenantId: tenantA, userId: '20000000-0000-4000-8000-000000000005', name: 'Casey Quinn', email: 'casey.viewer@example.test', role: 'viewer', status: 'active' },
  ],
  trafficSources: release2Demo.trafficSources,
  campaigns: release2Demo.campaigns,
  leads: [
    { id: 'l1', tenantId: tenantA, reference: 'AX-20481', externalLeadId: 'SYN-LEAD-20481', trafficSourceId: 'ts1', campaignId: 'c1', programId: 'p1', offerId: 'o1', program: 'Medical Assistant', source: 'Meta', campaign: 'Healthcare Careers', offer: 'Qualified Healthcare Inquiry', status: 'accepted', score: 91, receivedAt: '2026-08-16T13:42:00.000Z', createdAt: '2026-08-16T13:42:00.000Z' },
    { id: 'l2', tenantId: tenantA, reference: 'AX-20480', externalLeadId: 'SYN-LEAD-20480', trafficSourceId: 'ts2', campaignId: 'c1', programId: 'p2', offerId: 'o2', program: 'Pharmacy Technician', source: 'Google', campaign: 'Healthcare Careers', offer: 'Pharmacy Technician Interest', status: 'rejected', score: 78, receivedAt: '2026-08-16T13:18:00.000Z', createdAt: '2026-08-16T13:18:00.000Z' },
    { id: 'l3', tenantId: tenantA, reference: 'AX-20479', externalLeadId: 'SYN-LEAD-20479', trafficSourceId: 'ts2', campaignId: 'c2', programId: 'p3', offerId: 'o3', program: 'Psychology', source: 'Google', campaign: 'Psychology Programs', offer: 'Psychology Program Inquiry', status: 'delivering', score: 84, receivedAt: '2026-08-16T12:55:00.000Z', createdAt: '2026-08-16T12:55:00.000Z' },
    { id: 'l4', tenantId: tenantA, reference: 'AX-20478', externalLeadId: 'SYN-LEAD-20478', trafficSourceId: 'ts1', campaignId: 'c1', programId: 'p1', offerId: 'o1', program: 'Medical Assistant', source: 'Meta', campaign: 'Healthcare Careers', offer: 'Qualified Healthcare Inquiry', status: 'queued', score: 72, receivedAt: '2026-08-16T12:20:00.000Z', createdAt: '2026-08-16T12:20:00.000Z' },
    { id: 'l5', tenantId: tenantB, reference: 'AX-10012', externalLeadId: 'SYN-LEAD-10012', trafficSourceId: null, campaignId: null, programId: null, offerId: null, program: 'Unassigned', source: 'Organic', campaign: 'Unassigned', offer: 'Unassigned', status: 'new', score: 72, receivedAt: '2026-08-15T12:20:00.000Z', createdAt: '2026-08-15T12:20:00.000Z' },
  ],
  leadIdentities: release2Demo.leadIdentities,
  programs: [
    { id: 'p1', tenantId: tenantA, name: 'Medical Assistant', code: 'MED-ASST', category: 'Healthcare', status: 'active' },
    { id: 'p2', tenantId: tenantA, name: 'Pharmacy Technician', code: 'PHARM-TECH', category: 'Healthcare', status: 'active' },
    { id: 'p3', tenantId: tenantA, name: 'Psychology', code: 'PSYCH', category: 'Behavioral Science', status: 'active' },
  ],
  buyers: [
    { id: 'b1', tenantId: tenantA, name: 'Northstar University', externalReference: 'BUY-NORTHSTAR', notes: 'Synthetic buyer profile.', status: 'active', buyerType: 'education', deliveryMethod: 'ping_post', defaultPayout: 62, currency: 'USD', duplicateWindowDays: 30, exclusive: false, timezone: 'America/New_York', offers: 2, updatedAt: now },
    { id: 'b2', tenantId: tenantA, name: 'Meridian Career Institute', externalReference: 'BUY-MERIDIAN', notes: 'Synthetic buyer profile.', status: 'active', buyerType: 'career_training', deliveryMethod: 'host_post', defaultPayout: 58, currency: 'USD', duplicateWindowDays: 14, exclusive: true, timezone: 'America/Chicago', offers: 1, updatedAt: '2026-08-15T09:20:00.000Z' },
    { id: 'b3', tenantId: tenantA, name: 'Summit Online', externalReference: 'BUY-SUMMIT', notes: 'Synthetic online-program buyer.', status: 'active', buyerType: 'online_education', deliveryMethod: 'host_post', defaultPayout: 48, currency: 'USD', duplicateWindowDays: 30, exclusive: false, timezone: 'America/Denver', offers: 2, updatedAt: '2026-08-13T11:05:00.000Z' },
  ],
  offers: [
    { id: 'o1', tenantId: tenantA, name: 'Qualified Healthcare Inquiry', programId: 'p1', program: 'Medical Assistant', status: 'active', buyerCount: 2 },
    { id: 'o2', tenantId: tenantA, name: 'Pharmacy Technician Interest', programId: 'p2', program: 'Pharmacy Technician', status: 'active', buyerCount: 2 },
    { id: 'o3', tenantId: tenantA, name: 'Psychology Program Inquiry', programId: 'p3', program: 'Psychology', status: 'active', buyerCount: 1 },
  ],
  buyerPrograms: release2Demo.buyerPrograms,
  buyerRules: release2Demo.buyerRules,
  buyerCaps: release2Demo.buyerCaps,
  leadDeliveries: release2Demo.leadDeliveries,
  deliveryAttempts: release2Demo.deliveryAttempts,
  leadRejections: release2Demo.leadRejections,
  leadStatusHistory: release2Demo.leadStatusHistory,
  integrations: [
    { id: 'i1', tenantId: tenantA, name: 'Inbound Lead API', kind: 'API', status: 'connected', updatedAt: now },
    { id: 'i2', tenantId: tenantA, name: 'Webhook Delivery', kind: 'Webhook', status: 'needs_attention', updatedAt: '2026-08-14T18:20:00.000Z' },
    { id: 'i3', tenantId: tenantA, name: 'CRM Destination', kind: 'CRM', status: 'not_configured', updatedAt: '2026-08-10T18:20:00.000Z' },
  ],
  tenantSettings: [
    { id: 's1', tenantId: tenantA, key: 'locale', value: 'en-US' },
    { id: 's2', tenantId: tenantA, key: 'reporting_timezone', value: 'America/New_York' },
  ],
  auditEvents: [
    { id: 'a1', tenantId: tenantA, actor: 'Alex Morgan', eventType: 'buyer.updated', entityType: 'buyer', entityId: 'b1', occurredAt: now },
    { id: 'a2', tenantId: tenantA, actor: 'Jordan Lee', eventType: 'lead.updated', entityType: 'lead', entityId: 'l1', occurredAt: '2026-08-16T13:44:00.000Z' },
    { id: 'a3', tenantId: tenantA, actor: 'System', eventType: 'integration.configured', entityType: 'integration', entityId: 'i1', occurredAt: '2026-08-15T19:05:00.000Z' },
  ],
}

const state = structuredClone(initialSnapshot)

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))
const auditDemo = (tenantId: string, eventType: string, entityType: string, entityId: string) => state.auditEvents.unshift({ id: crypto.randomUUID(), tenantId, actor: state.user.name, eventType, entityType, entityId, occurredAt: new Date().toISOString() })
const requireDemoTenant = (tenantId: string) => { if (!state.tenants.some((item) => item.id === tenantId)) throw new Error('The authorized tenant was not found.') }
const requireQuery = (operation: string, result: { error: { code?: string; message: string } | null }) => {
  if (!result.error) return
  throw Object.assign(new Error(result.error.message), { code: result.error.code ?? 'UNKNOWN', operation })
}

export interface BuyerInput { id?: string; tenantId: string; name: string; externalReference: string; notes: string; status: Buyer['status']; buyerType?: string; deliveryMethod?: string; defaultPayout?: number; currency?: string; duplicateWindowDays?: number; exclusive?: boolean; timezone?: string }
export interface ProgramInput { id?: string; tenantId: string; name: string; code: string; category: string; status: Program['status'] }
export interface OfferInput { id?: string; tenantId: string; name: string; programId: string | null; buyerId?: string | null; status: Offer['status'] }
export interface LeadInput { id?: string; tenantId: string; reference: string; externalLeadId?: string; trafficSourceId?: string | null; campaignId?: string | null; programId: string | null; offerId?: string | null; source: string; status: Lead['status']; score: number }
export interface IntegrationInput { id?: string; tenantId: string; name: string; kind: string; status: Integration['status'] }
export interface TrafficSourceInput { id?: string; tenantId: string; name: string; sourceType: string; externalId: string; status: TrafficSource['status']; notes: string }
export interface CampaignInput { id?: string; tenantId: string; trafficSourceId: string | null; name: string; externalId: string; status: Campaign['status']; campaignType: string; startDate: string | null; endDate: string | null }
export interface BuyerProgramInput { id?: string; tenantId: string; buyerId: string; programId: string; status: BuyerProgram['status']; payout: number; priority: number }
export interface BuyerCapInput { id?: string; tenantId: string; buyerId: string; programId: string | null; capType: string; periodStart: string; periodEnd: string; limit: number; delivered: number; status: BuyerCap['status'] }

export const platformService = {
  async getSnapshot(requestedTenantId?: string): Promise<PlatformSnapshot> {
    if (!demoMode && supabase) {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Authentication is required.')
      const [profileResult, tenantsResult, membershipsResult] = await Promise.all([
        supabase.from('profiles').select('display_name,is_platform_admin').eq('id', auth.user.id).single(),
        supabase.from('tenants').select('id,name,slug,status,plan,created_at').order('name'),
        supabase.from('tenant_memberships').select(membershipSelect),
      ])
      requireQuery('workspace.profile', profileResult)
      requireQuery('workspace.tenants', tenantsResult)
      requireQuery('workspace.memberships', membershipsResult)
      const profile = profileResult.data
      if (!profile) throw new Error('Authenticated profile was not found.')
      const tenantRows = tenantsResult.data ?? []
      const membershipRows = membershipsResult.data ?? []
      const authorizedIds = profile.is_platform_admin ? tenantRows.map((row) => row.id) : membershipRows.filter((row) => row.user_id === auth.user.id && row.status === 'active').map((row) => row.tenant_id)
      const activeTenantId = requestedTenantId && authorizedIds.includes(requestedTenantId) ? requestedTenantId : authorizedIds[0]
      if (!activeTenantId) throw new Error('No authorized tenant workspace is available.')
      const [programsResult, sourcesResult, campaignsResult, leadsResult, buyersResult, offersResult, buyerProgramsResult, buyerRulesResult, buyerCapsResult, deliveriesResult, attemptsResult, rejectionsResult, statusHistoryResult, integrationsResult, settingsResult, auditResult] = await Promise.all([
        supabase.from('programs').select('id,tenant_id,name,code,category,status').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('traffic_sources').select('id,tenant_id,name,source_type,external_id,status,notes').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('campaigns').select('id,tenant_id,traffic_source_id,name,external_id,status,campaign_type,start_date,end_date').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('leads').select('id,tenant_id,reference,external_lead_id,traffic_source_id,campaign_id,program_id,offer_id,current_status,quality_score,received_at,created_at,traffic_source:traffic_sources!leads_traffic_source_id_fkey(name),campaign:campaigns!leads_campaign_id_fkey(name),program:programs!leads_program_id_fkey(name),offer:offers!leads_offer_id_fkey(name)').eq('tenant_id', activeTenantId).order('created_at', { ascending: false }).limit(250),
        supabase.from('buyers').select('id,tenant_id,name,status,external_reference,metadata,buyer_type,delivery_method,default_payout,currency,duplicate_window_days,exclusive,timezone,operating_notes,updated_at,buyer_offers(count)').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('offers').select('id,tenant_id,name,status,program_id,programs(name),buyer_offers(count)').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('buyer_programs').select('id,tenant_id,buyer_id,program_id,status,payout,priority').eq('tenant_id', activeTenantId).order('priority'),
        supabase.from('buyer_rules').select('id,tenant_id,buyer_id,rule_type,operator,value,status,priority').eq('tenant_id', activeTenantId).order('priority'),
        supabase.from('buyer_caps').select('id,tenant_id,buyer_id,program_id,cap_type,period_start,period_end,limit_value,delivered_value,status').eq('tenant_id', activeTenantId).order('period_end'),
        supabase.from('lead_deliveries').select('id,tenant_id,lead_id,status,started_at,completed_at,created_at').eq('tenant_id', activeTenantId).order('created_at', { ascending: false }),
        supabase.from('lead_delivery_attempts').select('id,tenant_id,lead_delivery_id,lead_id,buyer_id,offer_id,program_id,attempt_number,delivery_method,status,request_started_at,response_received_at,response_time_ms,external_reference,payout,created_at').eq('tenant_id', activeTenantId).order('created_at', { ascending: false }),
        supabase.from('lead_rejections').select('id,tenant_id,lead_id,delivery_attempt_id,buyer_id,rejection_code,rejection_category,reason,recoverable,created_at').eq('tenant_id', activeTenantId).order('created_at', { ascending: false }),
        supabase.from('lead_status_history').select('id,tenant_id,lead_id,from_status,to_status,reason,changed_by,created_at').eq('tenant_id', activeTenantId).order('created_at'),
        supabase.from('integrations').select('id,tenant_id,name,kind,status,updated_at').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('tenant_settings').select('id,tenant_id,setting_key,setting_value').eq('tenant_id', activeTenantId).order('setting_key'),
        supabase.from('audit_events').select(auditEventSelect).eq('tenant_id', activeTenantId).order('occurred_at', { ascending: false }).limit(100),
      ])
      requireQuery('workspace.programs', programsResult)
      requireQuery('workspace.traffic_sources', sourcesResult)
      requireQuery('workspace.campaigns', campaignsResult)
      requireQuery('workspace.leads', leadsResult)
      requireQuery('workspace.buyers', buyersResult)
      requireQuery('workspace.offers', offersResult)
      requireQuery('workspace.buyer_programs', buyerProgramsResult)
      requireQuery('workspace.buyer_rules', buyerRulesResult)
      requireQuery('workspace.buyer_caps', buyerCapsResult)
      requireQuery('workspace.lead_deliveries', deliveriesResult)
      requireQuery('workspace.delivery_attempts', attemptsResult)
      requireQuery('workspace.lead_rejections', rejectionsResult)
      requireQuery('workspace.lead_status_history', statusHistoryResult)
      requireQuery('workspace.integrations', integrationsResult)
      requireQuery('workspace.settings', settingsResult)
      requireQuery('workspace.audit', auditResult)
      const relationName = (value: unknown) => Array.isArray(value) ? String(value[0]?.name ?? '') : String((value as { name?: string } | null)?.name ?? '')
      const relationDisplayName = (value: unknown) => Array.isArray(value) ? String(value[0]?.display_name ?? '') : String((value as { display_name?: string } | null)?.display_name ?? '')
      const relationCount = (value: unknown) => Array.isArray(value) ? Number(value[0]?.count ?? 0) : 0
      const mayReadIdentity = membershipRows.some((row) => row.tenant_id === activeTenantId && row.user_id === auth.user.id && row.status === 'active' && ['tenant_admin', 'manager'].includes(row.role))
      const identityResult = mayReadIdentity ? await supabase.from('lead_identity').select('tenant_id,lead_id,first_name,last_name,email,phone').eq('tenant_id', activeTenantId) : { data: [], error: null }
      requireQuery('workspace.lead_identity', identityResult)
      return {
        user: { id: auth.user.id, name: profile.display_name, email: auth.user.email ?? '', isPlatformAdmin: profile.is_platform_admin },
        tenants: tenantRows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, status: row.status, plan: row.plan, createdAt: row.created_at })),
        memberships: membershipRows.map((row) => ({ id: row.id, tenantId: row.tenant_id, userId: row.user_id, name: relationDisplayName(row.member_profile) || 'Axis user', email: row.user_id === auth.user.id ? auth.user.email ?? '' : 'Protected account', role: row.role as TenantRole, status: row.status as Membership['status'] })),
        programs: (programsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, code: row.code, category: row.category ?? '', status: row.status as Program['status'] })),
        trafficSources: (sourcesResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, sourceType: row.source_type, externalId: row.external_id ?? '', status: row.status as TrafficSource['status'], notes: row.notes ?? '' })),
        campaigns: (campaignsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, trafficSourceId: row.traffic_source_id, name: row.name, externalId: row.external_id ?? '', status: row.status as Campaign['status'], campaignType: row.campaign_type ?? '', startDate: row.start_date, endDate: row.end_date })),
        leads: (leadsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, reference: row.reference, externalLeadId: row.external_lead_id ?? '', trafficSourceId: row.traffic_source_id, campaignId: row.campaign_id, programId: row.program_id, offerId: row.offer_id, program: relationName(row.program) || 'Unassigned', source: relationName(row.traffic_source) || 'Unknown', campaign: relationName(row.campaign) || 'Unassigned', offer: relationName(row.offer) || 'Unassigned', status: row.current_status as Lead['status'], score: Number(row.quality_score ?? 0), receivedAt: row.received_at, createdAt: row.created_at })),
        leadIdentities: (identityResult.data ?? []).map((row) => ({ leadId: row.lead_id, tenantId: row.tenant_id, displayName: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Protected identity', email: row.email ?? '', phone: row.phone ? `••• ${row.phone.slice(-4)}` : '', masked: true })),
        buyers: (buyersResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, externalReference: row.external_reference ?? '', notes: row.operating_notes ?? String((row.metadata as { notes?: string } | null)?.notes ?? ''), status: row.status === 'paused' ? 'paused' : 'active', buyerType: row.buyer_type, deliveryMethod: row.delivery_method, defaultPayout: Number(row.default_payout), currency: row.currency, duplicateWindowDays: row.duplicate_window_days, exclusive: row.exclusive, timezone: row.timezone, offers: relationCount(row.buyer_offers), updatedAt: row.updated_at })),
        offers: (offersResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, programId: row.program_id, program: relationName(row.programs) || 'Unassigned', status: row.status as Offer['status'], buyerCount: relationCount(row.buyer_offers) })),
        buyerPrograms: (buyerProgramsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, buyerId: row.buyer_id, programId: row.program_id, status: row.status as BuyerProgram['status'], payout: Number(row.payout ?? 0), priority: row.priority })),
        buyerRules: (buyerRulesResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, buyerId: row.buyer_id, ruleType: row.rule_type, operator: row.operator, value: JSON.stringify(row.value), status: row.status as BuyerRule['status'], priority: row.priority })),
        buyerCaps: (buyerCapsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, buyerId: row.buyer_id, programId: row.program_id, capType: row.cap_type, periodStart: row.period_start, periodEnd: row.period_end, limit: row.limit_value, delivered: row.delivered_value, status: row.status as BuyerCap['status'] })),
        leadDeliveries: (deliveriesResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, leadId: row.lead_id, status: row.status as LeadDelivery['status'], startedAt: row.started_at, completedAt: row.completed_at, createdAt: row.created_at })),
        deliveryAttempts: (attemptsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, deliveryId: row.lead_delivery_id, leadId: row.lead_id, buyerId: row.buyer_id, offerId: row.offer_id, programId: row.program_id, attemptNumber: row.attempt_number, deliveryMethod: row.delivery_method, status: row.status as DeliveryAttempt['status'], requestStartedAt: row.request_started_at, responseReceivedAt: row.response_received_at, responseTimeMs: row.response_time_ms, externalReference: row.external_reference ?? '', payout: row.payout == null ? null : Number(row.payout), createdAt: row.created_at })),
        leadRejections: (rejectionsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, leadId: row.lead_id, deliveryAttemptId: row.delivery_attempt_id, buyerId: row.buyer_id, rejectionCode: row.rejection_code ?? '', category: row.rejection_category, reason: row.reason ?? '', recoverable: row.recoverable, createdAt: row.created_at })),
        leadStatusHistory: (statusHistoryResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, leadId: row.lead_id, fromStatus: row.from_status as LeadStatusEvent['fromStatus'], toStatus: row.to_status as LeadStatusEvent['toStatus'], reason: row.reason ?? '', changedBy: row.changed_by, createdAt: row.created_at })),
        integrations: (integrationsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, kind: row.kind, status: row.status as Integration['status'], updatedAt: row.updated_at })),
        tenantSettings: (settingsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, key: row.setting_key, value: String((row.setting_value as { value?: unknown } | null)?.value ?? '') })),
        auditEvents: (auditResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, actor: relationDisplayName(row.actor_profile) || 'System', eventType: row.event_type, entityType: row.entity_type, entityId: row.entity_id ?? '', occurredAt: row.occurred_at })),
      }
    }
    await delay()
    const activeTenantId = requestedTenantId && state.tenants.some((tenant) => tenant.id === requestedTenantId) ? requestedTenantId : state.tenants[0].id
    const scoped = <T extends { tenantId: string }>(items: T[]) => items.filter((item) => item.tenantId === activeTenantId)
    return structuredClone({ ...state, programs: scoped(state.programs), trafficSources: scoped(state.trafficSources), campaigns: scoped(state.campaigns), leads: scoped(state.leads), leadIdentities: scoped(state.leadIdentities), buyers: scoped(state.buyers), offers: scoped(state.offers), buyerPrograms: scoped(state.buyerPrograms), buyerRules: scoped(state.buyerRules), buyerCaps: scoped(state.buyerCaps), leadDeliveries: scoped(state.leadDeliveries), deliveryAttempts: scoped(state.deliveryAttempts), leadRejections: scoped(state.leadRejections), leadStatusHistory: scoped(state.leadStatusHistory), integrations: scoped(state.integrations), tenantSettings: scoped(state.tenantSettings), auditEvents: state.auditEvents.filter((item) => item.tenantId === activeTenantId) })
  },
  async createTenant(input: Pick<Tenant, 'name' | 'slug' | 'plan'>): Promise<Tenant> {
    if (!demoMode && supabase) {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Authentication is required.')
      const { data, error } = await supabase.from('tenants').insert({ name: input.name, slug: input.slug, plan: input.plan, created_by: auth.user.id }).select('id,name,slug,status,plan,created_at').single()
      if (error) throw error
      return { id: data.id, name: data.name, slug: data.slug, status: data.status, plan: data.plan, createdAt: data.created_at }
    }
    await delay()
    if (state.tenants.some((tenant) => tenant.slug === input.slug)) throw new Error('A tenant with that slug already exists.')
    const tenant: Tenant = { ...input, id: crypto.randomUUID(), status: 'active', createdAt: new Date().toISOString() }
    state.tenants.push(tenant)
    state.auditEvents.unshift({ id: crypto.randomUUID(), tenantId: tenant.id, actor: state.user.name, eventType: 'tenant.created', entityType: 'tenant', entityId: tenant.id, occurredAt: new Date().toISOString() })
    return structuredClone(tenant)
  },
  async setTenantStatus(tenantId: string, status: Tenant['status']): Promise<void> {
    if (!demoMode && supabase) {
      const { error } = await supabase.from('tenants').update({ status }).eq('id', tenantId)
      if (error) throw error
      return
    }
    await delay()
    const tenant = state.tenants.find((item) => item.id === tenantId)
    if (!tenant) throw new Error('Tenant was not found.')
    tenant.status = status
    state.auditEvents.unshift({ id: crypto.randomUUID(), tenantId, actor: state.user.name, eventType: 'tenant.updated', entityType: 'tenant', entityId: tenantId, occurredAt: new Date().toISOString() })
  },
  async addMembership(tenantId: string, userId: string, role: TenantRole): Promise<void> {
    if (!isTenantAssignableRole(role)) throw new Error('Platform administrator cannot be assigned as a tenant role.')
    if (!demoMode && supabase) {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Authentication is required.')
      const { error } = await supabase.from('tenant_memberships').insert({ tenant_id: tenantId, user_id: userId, role, status: 'active', created_by: auth.user.id })
      if (error) throw error
      return
    }
    await delay(); requireDemoTenant(tenantId)
    if (state.memberships.some((item) => item.tenantId === tenantId && item.userId === userId)) throw new Error('That user already has a membership in this tenant.')
    const id = crypto.randomUUID(); state.memberships.push({ id, tenantId, userId, name: `Axis user ${userId.slice(0, 8)}`, email: 'Protected account', role, status: 'active' }); auditDemo(tenantId, 'tenant_memberships.insert', 'tenant_memberships', id)
  },
  async updateMembership(membershipId: string, tenantId: string, patch: { role?: TenantRole; status?: Membership['status'] }): Promise<void> {
    if (patch.role && !isTenantAssignableRole(patch.role)) throw new Error('Platform administrator cannot be assigned as a tenant role.')
    if (!demoMode && supabase) { const { error } = await supabase.from('tenant_memberships').update(patch).eq('id', membershipId).eq('tenant_id', tenantId); if (error) throw error; return }
    await delay(); const membership = state.memberships.find((item) => item.id === membershipId && item.tenantId === tenantId); if (!membership) throw new Error('Membership was not found.'); Object.assign(membership, patch); auditDemo(tenantId, patch.role ? 'membership.role_changed' : 'tenant_memberships.update', 'tenant_memberships', membershipId)
  },
  async saveTrafficSource(input: TrafficSourceInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, name: input.name, source_type: input.sourceType, external_id: input.externalId || null, status: input.status, notes: input.notes || null, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('traffic_sources').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('traffic_sources').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const existing = input.id ? state.trafficSources.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input); else state.trafficSources.push({ ...input, id: crypto.randomUUID() }); auditDemo(input.tenantId, `traffic_source.${existing ? 'updated' : 'created'}`, 'traffic_sources', existing?.id ?? input.id ?? input.tenantId)
  },
  async saveCampaign(input: CampaignInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, traffic_source_id: input.trafficSourceId, name: input.name, external_id: input.externalId || null, status: input.status, campaign_type: input.campaignType || null, start_date: input.startDate || null, end_date: input.endDate || null, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('campaigns').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('campaigns').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const validSource = !input.trafficSourceId || state.trafficSources.some((item) => item.id === input.trafficSourceId && item.tenantId === input.tenantId); if (!validSource) throw new Error('Invalid tenant relationship'); const existing = input.id ? state.campaigns.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input); else state.campaigns.push({ ...input, id: crypto.randomUUID() }); auditDemo(input.tenantId, `campaign.${existing ? 'updated' : 'created'}`, 'campaigns', existing?.id ?? input.id ?? input.tenantId)
  },
  async saveBuyerProgram(input: BuyerProgramInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, buyer_id: input.buyerId, program_id: input.programId, status: input.status, payout: input.payout, priority: input.priority, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('buyer_programs').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('buyer_programs').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); if (!state.buyers.some((item) => item.id === input.buyerId && item.tenantId === input.tenantId) || !state.programs.some((item) => item.id === input.programId && item.tenantId === input.tenantId)) throw new Error('Invalid tenant relationship'); const existing = input.id ? state.buyerPrograms.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input); else state.buyerPrograms.push({ ...input, id: crypto.randomUUID() }); auditDemo(input.tenantId, 'buyer_program.changed', 'buyer_programs', existing?.id ?? input.id ?? input.tenantId)
  },
  async saveBuyerCap(input: BuyerCapInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, buyer_id: input.buyerId, program_id: input.programId, cap_type: input.capType, period_start: input.periodStart, period_end: input.periodEnd, limit_value: input.limit, delivered_value: input.delivered, status: input.status, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('buyer_caps').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('buyer_caps').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); if (!state.buyers.some((item) => item.id === input.buyerId && item.tenantId === input.tenantId) || (input.programId && !state.programs.some((item) => item.id === input.programId && item.tenantId === input.tenantId))) throw new Error('Invalid tenant relationship'); const existing = input.id ? state.buyerCaps.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input); else state.buyerCaps.push({ ...input, id: crypto.randomUUID() }); auditDemo(input.tenantId, `buyer_cap.${existing ? 'updated' : 'created'}`, 'buyer_caps', existing?.id ?? input.id ?? input.tenantId)
  },
  async saveBuyer(input: BuyerInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, name: input.name, external_reference: input.externalReference || null, metadata: { notes: input.notes }, operating_notes: input.notes || null, status: input.status, buyer_type: input.buyerType ?? 'education', delivery_method: input.deliveryMethod ?? 'manual', default_payout: input.defaultPayout ?? 0, currency: input.currency ?? 'USD', duplicate_window_days: input.duplicateWindowDays ?? 30, exclusive: input.exclusive ?? false, timezone: input.timezone ?? 'UTC', created_by: auth.user?.id }; const query = input.id ? supabase.from('buyers').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : supabase.from('buyers').insert(payload); const { error } = await query; if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const existing = input.id ? state.buyers.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; const expanded = { ...input, buyerType: input.buyerType ?? existing?.buyerType ?? 'education', deliveryMethod: input.deliveryMethod ?? existing?.deliveryMethod ?? 'manual', defaultPayout: input.defaultPayout ?? existing?.defaultPayout ?? 0, currency: input.currency ?? existing?.currency ?? 'USD', duplicateWindowDays: input.duplicateWindowDays ?? existing?.duplicateWindowDays ?? 30, exclusive: input.exclusive ?? existing?.exclusive ?? false, timezone: input.timezone ?? existing?.timezone ?? 'UTC' }; if (existing) Object.assign(existing, expanded, { updatedAt: new Date().toISOString() }); else { const id = crypto.randomUUID(); state.buyers.push({ ...expanded, id, offers: 0, updatedAt: new Date().toISOString() }); input.id = id } auditDemo(input.tenantId, `buyers.${existing ? 'update' : 'insert'}`, 'buyers', input.id!)
  },
  async saveProgram(input: ProgramInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, name: input.name, code: input.code, category: input.category, status: input.status, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('programs').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('programs').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const existing = input.id ? state.programs.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input); else { const id = crypto.randomUUID(); state.programs.push({ ...input, id }); input.id = id } auditDemo(input.tenantId, `programs.${existing ? 'update' : 'insert'}`, 'programs', input.id!)
  },
  async saveOffer(input: OfferInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, name: input.name, program_id: input.programId, status: input.status, created_by: auth.user?.id }; let offerId = input.id; if (offerId) { const { error } = await supabase.from('offers').update(payload).eq('id', offerId).eq('tenant_id', input.tenantId); if (error) throw error } else { const { data, error } = await supabase.from('offers').insert(payload).select('id').single(); if (error) throw error; offerId = data.id } if (input.buyerId) { const { error } = await supabase.from('buyer_offers').upsert({ tenant_id: input.tenantId, buyer_id: input.buyerId, offer_id: offerId, status: 'active', created_by: auth.user?.id }, { onConflict: 'tenant_id,buyer_id,offer_id' }); if (error) throw error } return }
    await delay(); requireDemoTenant(input.tenantId); const program = state.programs.find((item) => item.id === input.programId && item.tenantId === input.tenantId); const existing = input.id ? state.offers.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input, { program: program?.name ?? 'Unassigned' }); else { const id = crypto.randomUUID(); state.offers.push({ ...input, id, program: program?.name ?? 'Unassigned', buyerCount: input.buyerId ? 1 : 0 }); input.id = id; const buyer = state.buyers.find((item) => item.id === input.buyerId && item.tenantId === input.tenantId); if (buyer) buyer.offers += 1 } auditDemo(input.tenantId, `offers.${existing ? 'update' : 'insert'}`, 'offers', input.id!)
  },
  async saveLead(input: LeadInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, reference: input.reference, external_lead_id: input.externalLeadId || null, traffic_source_id: input.trafficSourceId ?? null, campaign_id: input.campaignId ?? null, program_id: input.programId, offer_id: input.offerId ?? null, source: input.source, status: input.status, current_status: input.status, lead_score: input.score, quality_score: input.score, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('leads').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('leads').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const program = state.programs.find((item) => item.id === input.programId && item.tenantId === input.tenantId); const source = state.trafficSources.find((item) => item.id === input.trafficSourceId && item.tenantId === input.tenantId); const campaign = state.campaigns.find((item) => item.id === input.campaignId && item.tenantId === input.tenantId); const offer = state.offers.find((item) => item.id === input.offerId && item.tenantId === input.tenantId); const existing = input.id ? state.leads.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; const timestamp = new Date().toISOString(); const expanded = { ...input, externalLeadId: input.externalLeadId ?? existing?.externalLeadId ?? '', trafficSourceId: input.trafficSourceId ?? existing?.trafficSourceId ?? null, campaignId: input.campaignId ?? existing?.campaignId ?? null, offerId: input.offerId ?? existing?.offerId ?? null, program: program?.name ?? 'Unassigned', source: source?.name ?? input.source, campaign: campaign?.name ?? 'Unassigned', offer: offer?.name ?? 'Unassigned' }; if (existing) { const previous = existing.status; Object.assign(existing, expanded); if (previous !== input.status) state.leadStatusHistory.push({ id: crypto.randomUUID(), tenantId: input.tenantId, leadId: existing.id, fromStatus: previous, toStatus: input.status, reason: 'Operational status updated', changedBy: state.user.id, createdAt: timestamp }) } else { const id = crypto.randomUUID(); state.leads.push({ ...expanded, id, receivedAt: timestamp, createdAt: timestamp }); state.leadStatusHistory.push({ id: crypto.randomUUID(), tenantId: input.tenantId, leadId: id, fromStatus: null, toStatus: input.status, reason: 'Lead created', changedBy: state.user.id, createdAt: timestamp }); input.id = id } auditDemo(input.tenantId, `leads.${existing ? 'update' : 'insert'}`, 'leads', input.id!)
  },
  async saveIntegration(input: IntegrationInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, name: input.name, kind: input.kind, status: input.status, config_reference: null, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('integrations').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('integrations').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const existing = input.id ? state.integrations.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input, { updatedAt: new Date().toISOString() }); else { const id = crypto.randomUUID(); state.integrations.push({ ...input, id, updatedAt: new Date().toISOString() }); input.id = id } auditDemo(input.tenantId, `integrations.${existing ? 'update' : 'insert'}`, 'integrations', input.id!)
  },
  async saveTenantSetting(tenantId: string, key: string, value: string): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const { error } = await supabase.from('tenant_settings').upsert({ tenant_id: tenantId, setting_key: key, setting_value: { value }, created_by: auth.user?.id }, { onConflict: 'tenant_id,setting_key' }); if (error) throw error; return }
    await delay(); requireDemoTenant(tenantId); const existing = state.tenantSettings.find((item) => item.tenantId === tenantId && item.key === key); if (existing) existing.value = value; else state.tenantSettings.push({ id: crypto.randomUUID(), tenantId, key, value }); auditDemo(tenantId, 'tenant_setting.updated', 'tenant_settings', existing?.id ?? tenantId)
  },
}
