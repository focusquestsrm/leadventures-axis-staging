import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202608160004_release_2_lead_ecosystem.sql', import.meta.url), 'utf8').toLowerCase()
const r2Tables = ['traffic_sources','campaigns','buyer_programs','offer_programs','buyer_rules','buyer_caps','lead_deliveries','lead_delivery_attempts','lead_rejections','lead_status_history']

describe('Release 2 database contract', () => {
  it.each(r2Tables)('tenant-scopes %s', (table) => {
    expect(migration).toMatch(new RegExp(`create table public\\.${table} \\([\\s\\s]*?tenant_id uuid not null`.replace('\\s\\s', '\\s\\S')))
  })

  it.each(r2Tables)('enables RLS for %s', (table) => {
    expect(migration).toContain(`alter table public.%i enable row level security`)
    expect(migration).toContain(`'${table}'`)
  })

  it('keeps viewers read-only and grants writes through named tenant roles', () => {
    expect(migration).toContain("[''tenant_admin'',''manager'']")
    expect(migration).toContain("[''tenant_admin'',''manager'',''media_buyer'']")
    expect(migration).not.toMatch(/viewer[^;]*_write/)
  })

  it('preserves multiple ordered attempts per delivery', () => {
    expect(migration).toContain('attempt_number integer not null')
    expect(migration).toContain('unique (lead_delivery_id,attempt_number)')
  })

  it('associates one structured rejection to its exact attempt', () => {
    expect(migration).toContain('delivery_attempt_id uuid not null unique references public.lead_delivery_attempts')
  })

  it('records lead status transitions automatically', () => {
    expect(migration).toContain('create trigger lead_status_history_capture')
    expect(migration).toContain('old.current_status is distinct from new.current_status')
  })

  it('rejects cross-tenant relationships in the database', () => {
    expect(migration).toContain('axis_enforce_r2_tenant_fk')
    expect(migration).toContain("raise exception 'invalid tenant relationship'")
    for (const relation of ['traffic_sources','campaigns','leads','lead_deliveries','lead_delivery_attempts','buyers','programs','offers']) expect(migration).toContain(`from public.${relation}`)
  })

  it('keeps PII and raw delivery payloads out of operational tables', () => {
    expect(migration).not.toMatch(/create table public\.(lead_delivery_attempts|lead_rejections)[\s\S]*?\b(email|phone|first_name|last_name|request_body|response_body|raw_payload)\b/)
  })

  it('adds audit triggers for every material R2 entity', () => {
    expect(migration).toContain('execute function public.axis_capture_audit_event()')
    for (const table of r2Tables) expect(migration).toContain(`'${table}'`)
  })

  it('indexes tenant lead, buyer, program, status, and time access paths', () => {
    for (const fragment of ['delivery_attempts_tenant_lead_idx','delivery_attempts_tenant_buyer_idx','delivery_attempts_tenant_status_idx','buyer_caps_tenant_program_idx','lead_status_history_tenant_lead_idx']) expect(migration).toContain(fragment)
  })
})
