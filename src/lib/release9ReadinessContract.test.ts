import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { can, isTenantAssignableRole } from './rbac'
import { isDemoModeEnabled } from './supabase'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const app = read('../App.tsx')
const shell = read('../components/Shell.tsx')
const readiness = read('../readinessPage.tsx')
const diagnostics = read('./diagnostics.ts')
const csv = read('../integrations/csv.ts')
const migration = read('../../supabase/migrations/202608160011_release_8_orchestration.sql')
const productPages = ['../pages.tsx','../release2Pages.tsx','../intelligencePages.tsx','../integrationPages.tsx','../recoveryPages.tsx','../acquirePages.tsx','../automationPages.tsx'].map(read).join('\n')

describe('Release 9 commercial readiness contract', () => {
  it('keeps the readiness dashboard administrator-only', () => {
    expect(app).toContain('path="/admin/readiness"')
    expect(app).toContain("allowed('tenant:manage') || allowed('platform:manage')")
    expect(shell).toContain('Commercial Readiness')
  })
  it('reports every go/no-go category with owners and actions', () => {
    for (const category of ['Security','Tenant Isolation','RBAC','PII / Privacy','Compliance Foundation','Integrations','Automation Safety','Monitoring','Backups','Performance','Documentation','Production Checklist']) expect(readiness).toContain(`name: '${category}'`)
    expect(readiness).toContain('owner:')
    expect(readiness).toContain('action:')
    expect(readiness).toContain('This page is not a production approval.')
  })
  it('preserves the complete role boundary matrix', () => {
    expect(can('viewer','lead:write')).toBe(false)
    expect(can('analyst','automation:approve')).toBe(false)
    expect(can('media_buyer','automation:execute')).toBe(true)
    expect(can('manager','platform:manage')).toBe(false)
    expect(can('tenant_admin','platform:manage')).toBe(false)
    expect(isTenantAssignableRole('platform_admin')).toBe(false)
    expect(can(undefined,'lead:identity:read',true)).toBe(false)
  })
  it('prevents demo mode in production', () => expect(isDemoModeEnabled(false,'true')).toBe(false))
  it('redacts PII and credentials from diagnostic messages', () => {
    for (const marker of ['redacted email','redacted phone','redacted authorization','redacted token','redacted secret']) expect(diagnostics).toContain(marker)
  })
  it('bounds browser import validation', () => {
    for (const limit of ['5 * 1024 * 1024','10_001','10_000','10,000 characters','200 columns','unterminated quoted value']) expect(csv).toContain(limit)
  })
  it('keeps automation conservative and secret-free', () => {
    expect(migration).toContain("default_mode text not null default 'advisory'")
    expect(migration).toContain("execution_mode text not null default 'simulated'")
    expect(migration).toContain('axis_automation_json_is_safe')
  })
  it('provides basic customer and administration route smoke coverage', () => {
    for (const route of ['/', '/acquire', '/convert', '/route', '/recover', '/optimize', '/automation', '/integrations', '/admin', '/admin/readiness']) expect(app).toContain(`path="${route}"`)
  })
  it('does not expose internal release labels in customer-facing views', () => expect(productPages).not.toMatch(/release\s+[1-9]/i))
  it('ships the complete readiness documentation map', () => {
    const index = read('../../docs/README.md')
    for (const file of ['release-9-commercial-readiness.md','tenant-isolation-certification.md','rbac-certification.md','automation-safety-certification.md','compliance-readiness.md','integration-readiness.md','monitoring-and-operations.md','backup-and-disaster-recovery.md','performance-readiness.md','white-label-readiness.md','customer-onboarding.md','admin-onboarding.md','support-runbook.md','production-launch-checklist.md']) expect(index).toContain(file)
  })
})
