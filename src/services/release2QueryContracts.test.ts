import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const service = readFileSync(new URL('./platformService.ts', import.meta.url), 'utf8')

describe('Release 2 Supabase query contracts', () => {
  it('disambiguates every embedded lead relationship by its actual foreign key', () => {
    for (const relationship of [
      'traffic_sources!leads_traffic_source_id_fkey',
      'campaigns!leads_campaign_id_fkey',
      'programs!leads_program_id_fkey',
      'offers!leads_offer_id_fkey',
    ]) expect(service).toContain(relationship)
  })

  it('does not select raw payload or identity fields with delivery attempts', () => {
    const attemptQuery = service.match(/from\('lead_delivery_attempts'\)\.select\('([^']+)'\)/)?.[1] ?? ''
    expect(attemptQuery).not.toMatch(/email|phone|first_name|last_name|payload|request_body|response_body/)
  })

  it('loads lead identity only after a direct privileged membership check', () => {
    expect(service).toContain("['tenant_admin', 'manager'].includes(row.role)")
    expect(service.indexOf('const mayReadIdentity')).toBeLessThan(service.indexOf("from('lead_identity')"))
  })
})
