import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../../supabase/migrations/202608160001_release_1_foundation.sql', import.meta.url), 'utf8')
const auditRepair = readFileSync(new URL('../../supabase/migrations/202608160002_fix_audit_trigger_generic_records.sql', import.meta.url), 'utf8')
const programCategoryRepair = readFileSync(new URL('../../supabase/migrations/202608160003_add_program_category.sql', import.meta.url), 'utf8')

describe('Release 1 migration security contract', () => {
  it.each(['tenant_branding', 'tenant_memberships', 'buyers', 'programs', 'offers', 'buyer_offers', 'leads', 'lead_identity', 'lead_attributes', 'integrations', 'tenant_settings', 'feature_flags'])(
    'requires tenant_id on %s',
    (table) => expect(migration).toMatch(new RegExp(`create table public\\.${table} \\([\\s\\S]*?tenant_id uuid not null`)),
  )

  it('forbids platform_admin as a tenant membership role', () => {
    expect(migration).toContain("constraint tenant_memberships_no_platform_role check (role <> 'platform_admin')")
  })

  it('uses direct membership rather than platform status for identity access', () => {
    expect(migration).toContain('lead_identity_privileged_read')
    expect(migration).toContain("axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']")
  })

  it('does not grant authenticated users audit mutation access', () => {
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^;]*audit_events/i)
  })

  it('enables RLS on every application table', () => {
    const tables = [...migration.matchAll(/create table public\.([a-z_]+)/g)].map((match) => match[1])
    for (const table of tables) expect(migration).toContain(`alter table public.${table} enable row level security`)
  })

  it('repairs generic audit records through safe JSONB access', () => {
    expect(auditRepair).toContain("old_data->>'role'")
    expect(auditRepair).toContain("new_data->>'status'")
    expect(auditRepair).not.toMatch(/\bold\.role\b|\bnew\.role\b|\bold\.status\b|\bnew\.status\b/i)
  })

  it('repairs staging program schemas missing the category field', () => {
    expect(programCategoryRepair).toMatch(/alter table public\.programs[\s\S]*add column if not exists category text not null default 'General'/i)
  })
})
