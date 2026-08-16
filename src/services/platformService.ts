import type { AuditEvent, Buyer, Integration, Lead, Membership, Offer, Program, SessionUser, Tenant, TenantRole, TenantSetting } from '../types'
import { demoMode, supabase } from '../lib/supabase'
import { isTenantAssignableRole } from '../lib/rbac'
import { auditEventSelect, membershipSelect } from './queryContracts'

export interface PlatformSnapshot {
  user: SessionUser
  tenants: Tenant[]
  memberships: Membership[]
  programs: Program[]
  leads: Lead[]
  buyers: Buyer[]
  offers: Offer[]
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
  leads: [
    { id: 'l1', tenantId: tenantA, reference: 'AX-20481', programId: 'p1', program: 'Career Pathways', source: 'Paid search', status: 'qualified', score: 91, createdAt: '2026-08-16T13:42:00.000Z' },
    { id: 'l2', tenantId: tenantA, reference: 'AX-20480', programId: 'p2', program: 'Healthcare Programs', source: 'Organic', status: 'new', score: 78, createdAt: '2026-08-16T13:18:00.000Z' },
    { id: 'l3', tenantId: tenantA, reference: 'AX-20479', programId: 'p1', program: 'Career Pathways', source: 'Partner referral', status: 'processing', score: 84, createdAt: '2026-08-16T12:55:00.000Z' },
    { id: 'l4', tenantId: tenantA, reference: 'AX-20478', programId: 'p3', program: 'Technology Programs', source: 'Paid social', status: 'rejected', score: 42, createdAt: '2026-08-16T12:20:00.000Z' },
    { id: 'l5', tenantId: tenantB, reference: 'AX-10012', programId: null, program: 'Unassigned', source: 'Organic', status: 'new', score: 72, createdAt: '2026-08-15T12:20:00.000Z' },
  ],
  programs: [
    { id: 'p1', tenantId: tenantA, name: 'Career Pathways', code: 'CAREER', category: 'Education', status: 'active' },
    { id: 'p2', tenantId: tenantA, name: 'Healthcare Programs', code: 'HEALTH', category: 'Healthcare', status: 'active' },
    { id: 'p3', tenantId: tenantA, name: 'Technology Programs', code: 'TECH', category: 'Technology', status: 'draft' },
  ],
  buyers: [
    { id: 'b1', tenantId: tenantA, name: 'Meridian Education Demo', externalReference: 'BUY-MERIDIAN', notes: 'Synthetic education buyer.', status: 'active', offers: 2, updatedAt: now },
    { id: 'b2', tenantId: tenantA, name: 'Summit Skills Demo', externalReference: 'BUY-SUMMIT', notes: '', status: 'active', offers: 1, updatedAt: '2026-08-15T09:20:00.000Z' },
    { id: 'b3', tenantId: tenantA, name: 'Harbor Health Training Demo', externalReference: 'BUY-HARBOR', notes: '', status: 'paused', offers: 1, updatedAt: '2026-08-13T11:05:00.000Z' },
  ],
  offers: [
    { id: 'o1', tenantId: tenantA, name: 'Qualified Education Inquiry', programId: 'p1', program: 'Career Pathways', status: 'active', buyerCount: 2 },
    { id: 'o2', tenantId: tenantA, name: 'Allied Health Prospect', programId: 'p2', program: 'Healthcare Programs', status: 'active', buyerCount: 1 },
    { id: 'o3', tenantId: tenantA, name: 'Technology Interest', programId: 'p3', program: 'Technology Programs', status: 'draft', buyerCount: 0 },
  ],
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

export interface BuyerInput { id?: string; tenantId: string; name: string; externalReference: string; notes: string; status: Buyer['status'] }
export interface ProgramInput { id?: string; tenantId: string; name: string; code: string; category: string; status: Program['status'] }
export interface OfferInput { id?: string; tenantId: string; name: string; programId: string | null; buyerId?: string | null; status: Offer['status'] }
export interface LeadInput { id?: string; tenantId: string; reference: string; programId: string | null; source: string; status: Lead['status']; score: number }
export interface IntegrationInput { id?: string; tenantId: string; name: string; kind: string; status: Integration['status'] }

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
      const [programsResult, leadsResult, buyersResult, offersResult, integrationsResult, settingsResult, auditResult] = await Promise.all([
        supabase.from('programs').select('id,tenant_id,name,code,category,status').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('leads').select('id,tenant_id,reference,source,status,lead_score,created_at,program_id,programs(name)').eq('tenant_id', activeTenantId).order('created_at', { ascending: false }).limit(250),
        supabase.from('buyers').select('id,tenant_id,name,status,external_reference,metadata,updated_at,buyer_offers(count)').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('offers').select('id,tenant_id,name,status,program_id,programs(name),buyer_offers(count)').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('integrations').select('id,tenant_id,name,kind,status,updated_at').eq('tenant_id', activeTenantId).order('name'),
        supabase.from('tenant_settings').select('id,tenant_id,setting_key,setting_value').eq('tenant_id', activeTenantId).order('setting_key'),
        supabase.from('audit_events').select(auditEventSelect).eq('tenant_id', activeTenantId).order('occurred_at', { ascending: false }).limit(100),
      ])
      requireQuery('workspace.programs', programsResult)
      requireQuery('workspace.leads', leadsResult)
      requireQuery('workspace.buyers', buyersResult)
      requireQuery('workspace.offers', offersResult)
      requireQuery('workspace.integrations', integrationsResult)
      requireQuery('workspace.settings', settingsResult)
      requireQuery('workspace.audit', auditResult)
      const relationName = (value: unknown) => Array.isArray(value) ? String(value[0]?.name ?? '') : String((value as { name?: string } | null)?.name ?? '')
      const relationDisplayName = (value: unknown) => Array.isArray(value) ? String(value[0]?.display_name ?? '') : String((value as { display_name?: string } | null)?.display_name ?? '')
      const relationCount = (value: unknown) => Array.isArray(value) ? Number(value[0]?.count ?? 0) : 0
      return {
        user: { id: auth.user.id, name: profile.display_name, email: auth.user.email ?? '', isPlatformAdmin: profile.is_platform_admin },
        tenants: tenantRows.map((row) => ({ id: row.id, name: row.name, slug: row.slug, status: row.status, plan: row.plan, createdAt: row.created_at })),
        memberships: membershipRows.map((row) => ({ id: row.id, tenantId: row.tenant_id, userId: row.user_id, name: relationDisplayName(row.member_profile) || 'Axis user', email: row.user_id === auth.user.id ? auth.user.email ?? '' : 'Protected account', role: row.role as TenantRole, status: row.status as Membership['status'] })),
        programs: (programsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, code: row.code, category: row.category ?? '', status: row.status as Program['status'] })),
        leads: (leadsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, reference: row.reference, programId: row.program_id, program: relationName(row.programs) || 'Unassigned', source: row.source ?? 'Unknown', status: row.status as Lead['status'], score: Number(row.lead_score ?? 0), createdAt: row.created_at })),
        buyers: (buyersResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, externalReference: row.external_reference ?? '', notes: String((row.metadata as { notes?: string } | null)?.notes ?? ''), status: row.status === 'paused' ? 'paused' : 'active', offers: relationCount(row.buyer_offers), updatedAt: row.updated_at })),
        offers: (offersResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, programId: row.program_id, program: relationName(row.programs) || 'Unassigned', status: row.status as Offer['status'], buyerCount: relationCount(row.buyer_offers) })),
        integrations: (integrationsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, name: row.name, kind: row.kind, status: row.status as Integration['status'], updatedAt: row.updated_at })),
        tenantSettings: (settingsResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, key: row.setting_key, value: String((row.setting_value as { value?: unknown } | null)?.value ?? '') })),
        auditEvents: (auditResult.data ?? []).map((row) => ({ id: row.id, tenantId: row.tenant_id, actor: relationDisplayName(row.actor_profile) || 'System', eventType: row.event_type, entityType: row.entity_type, entityId: row.entity_id ?? '', occurredAt: row.occurred_at })),
      }
    }
    await delay()
    const activeTenantId = requestedTenantId && state.tenants.some((tenant) => tenant.id === requestedTenantId) ? requestedTenantId : state.tenants[0].id
    return structuredClone({ ...state, programs: state.programs.filter((item) => item.tenantId === activeTenantId), leads: state.leads.filter((item) => item.tenantId === activeTenantId), buyers: state.buyers.filter((item) => item.tenantId === activeTenantId), offers: state.offers.filter((item) => item.tenantId === activeTenantId), integrations: state.integrations.filter((item) => item.tenantId === activeTenantId), tenantSettings: state.tenantSettings.filter((item) => item.tenantId === activeTenantId), auditEvents: state.auditEvents.filter((item) => item.tenantId === activeTenantId) })
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
  async saveBuyer(input: BuyerInput): Promise<void> {
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, name: input.name, external_reference: input.externalReference || null, metadata: { notes: input.notes }, status: input.status, created_by: auth.user?.id }; const query = input.id ? supabase.from('buyers').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : supabase.from('buyers').insert(payload); const { error } = await query; if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const existing = input.id ? state.buyers.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input, { updatedAt: new Date().toISOString() }); else { const id = crypto.randomUUID(); state.buyers.push({ ...input, id, offers: 0, updatedAt: new Date().toISOString() }); input.id = id } auditDemo(input.tenantId, `buyers.${existing ? 'update' : 'insert'}`, 'buyers', input.id!)
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
    if (!demoMode && supabase) { const { data: auth } = await supabase.auth.getUser(); const payload = { tenant_id: input.tenantId, reference: input.reference, program_id: input.programId, source: input.source, status: input.status, lead_score: input.score, created_by: auth.user?.id }; const { error } = input.id ? await supabase.from('leads').update(payload).eq('id', input.id).eq('tenant_id', input.tenantId) : await supabase.from('leads').insert(payload); if (error) throw error; return }
    await delay(); requireDemoTenant(input.tenantId); const program = state.programs.find((item) => item.id === input.programId && item.tenantId === input.tenantId); const existing = input.id ? state.leads.find((item) => item.id === input.id && item.tenantId === input.tenantId) : undefined; if (existing) Object.assign(existing, input, { program: program?.name ?? 'Unassigned' }); else { const id = crypto.randomUUID(); state.leads.push({ ...input, id, program: program?.name ?? 'Unassigned', createdAt: new Date().toISOString() }); input.id = id } auditDemo(input.tenantId, `leads.${existing ? 'update' : 'insert'}`, 'leads', input.id!)
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
