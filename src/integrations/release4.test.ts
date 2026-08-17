import { describe, expect, it } from 'vitest'
import { leadHoopDemoCsv, release4Demo } from '../data/release4Demo'
import { previewLeadHoopImport } from '../services/integrationService'
import type { Buyer, DeliveryAttempt, Lead } from '../types'
import { crmOutcomeAdapter } from './crmAdapter'
import { parseCsv } from './csv'
import { leadHoopAdapter } from './leadhoopAdapter'
import { isDuplicate, matchBuyer, matchLead } from './matching'

const tenant='10000000-0000-4000-8000-000000000001'
const otherTenant='20000000-0000-4000-8000-000000000002'
const leads=[
  { id:'l1',tenantId:tenant,externalLeadId:'SYN-LEAD-20481' },
  { id:'l2',tenantId:tenant,externalLeadId:'DUPLICATE' },
  { id:'l3',tenantId:tenant,externalLeadId:'DUPLICATE' },
  { id:'private',tenantId:otherTenant,externalLeadId:'SYN-LEAD-20480' },
] as Lead[]
const buyers=[
  { id:'b1',tenantId:tenant,name:'Northstar University',externalReference:'BUY-NORTHSTAR' },
  { id:'b2',tenantId:tenant,name:'Meridian Career Institute',externalReference:'BUY-MERIDIAN' },
  { id:'private-buyer',tenantId:otherTenant,name:'Summit Online',externalReference:'BUY-SUMMIT' },
] as Buyer[]
const attempts=[{ id:'a1',tenantId:tenant,externalReference:'LH-DEMO-003' }] as DeliveryAttempt[]
const mappings=release4Demo.fieldMappings

describe('Release 4 canonical integration adapters', () => {
  it('parses quoted CSV fields without splitting embedded commas', () => expect(parseCsv('id,name\n1,"University, North"')[0].name).toBe('University, North'))
  it('rejects duplicate CSV headers', () => expect(() => parseCsv('id,id\n1,2')).toThrow(/unique/))
  it('rejects malformed and structurally oversized CSV rows', () => {
    expect(() => parseCsv('id,name\n1,"unterminated')).toThrow(/unterminated/)
    expect(() => parseCsv('id\n1,unexpected')).toThrow(/more values/)
  })
  it('rejects oversized cells and batches before adapter processing', () => {
    expect(() => parseCsv(`id\n${'x'.repeat(10_001)}`)).toThrow(/10,000 characters/)
    expect(() => parseCsv(`id\n${Array.from({ length: 10_001 }, (_, index) => index).join('\n')}`)).toThrow(/10,000 data rows/)
  })
  it('normalizes mapped LeadHoop fields to canonical types', () => { const result=leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0]; expect(result.record).toMatchObject({ externalTransactionId:'LH-DEMO-001',externalLeadId:'SYN-LEAD-20481',status:'accepted',responseTimeMs:842,payout:62,sourceSystem:'LeadHoop' }) })
  it('rejects rows without deterministic lead identifiers', () => { const result=leadHoopAdapter.normalize(parseCsv('transaction_id,lead_id,buyer,status,created_at\nx,,Northstar University,accepted,2026-08-16T00:00:00Z'),mappings)[0]; expect(result.issues.map((issue) => issue.code)).toContain('MISSING_LEAD_IDENTIFIER') })
  it('rejects negative response times and payouts', () => { const row='transaction_id,lead_id,buyer,status,response_ms,payout,created_at\nx,SYN-LEAD-20481,Northstar University,accepted,-1,-5,2026-08-16T00:00:00Z'; const codes=leadHoopAdapter.normalize(parseCsv(row),mappings)[0].issues.map((issue) => issue.code); expect(codes).toEqual(expect.arrayContaining(['INVALID_RESPONSE_TIME','INVALID_PAYOUT'])) })
  it('warns when a rejection lacks a reason', () => { const row='transaction_id,lead_id,buyer,status,created_at\nx,SYN-LEAD-20481,Northstar University,rejected,2026-08-16T00:00:00Z'; expect(leadHoopAdapter.normalize(parseCsv(row),mappings)[0].issues).toContainEqual(expect.objectContaining({ code:'MISSING_REJECTION_REASON',severity:'warning' })) })
  it('matches Axis IDs before external identifiers', () => { const record={ ...leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0].record!,axisLeadId:'l1',externalLeadId:'missing' }; expect(matchLead(record,leads).lead?.id).toBe('l1') })
  it('matches exact trusted external lead identifiers', () => { const record=leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0].record!; expect(matchLead(record,leads).lead?.id).toBe('l1') })
  it('requires review for ambiguous external identifiers', () => { const record={ ...leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0].record!,externalLeadId:'DUPLICATE' }; expect(matchLead(record,leads).status).toBe('requires_review') })
  it('does not guess unmatched leads', () => { const record={ ...leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0].record!,externalLeadId:'unknown' }; expect(matchLead(record,leads).status).toBe('unmatched') })
  it('matches buyers by exact normalized name or external reference', () => { const record=leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0].record!; expect(matchBuyer(record,buyers)?.id).toBe('b1'); expect(matchBuyer({ ...record,buyer:'BUY-MERIDIAN' },buyers)?.id).toBe('b2') })
  it('detects an existing external transaction idempotently', () => { const record={ ...leadHoopAdapter.normalize(parseCsv(leadHoopDemoCsv),mappings)[0].record!,externalTransactionId:'LH-DEMO-003' }; expect(isDuplicate(record,attempts)).toBe(true) })
  it('isolates preview matching to the requested tenant', () => { const csv='transaction_id,lead_id,buyer,status,created_at\nx,SYN-LEAD-20480,Summit Online,accepted,2026-08-16T00:00:00Z'; const result=previewLeadHoopImport(csv,{ tenantId:tenant,mappings,leads,buyers,attempts:[] }); expect(result.rows[0]).toMatchObject({ matchStatus:'unmatched',buyerId:null }) })
  it('summarizes valid, invalid, duplicate, and unmatched rows', () => { const result=previewLeadHoopImport(leadHoopDemoCsv,{ tenantId:tenant,mappings,leads,buyers,attempts }); expect(result.rowsDetected).toBe(6); expect(result.duplicates).toBe(1); expect(result.invalidRows).toBeGreaterThan(0); expect(result.unmatchedLeads).toBeGreaterThan(0) })
  it('never retains unmapped PII columns in normalized records', () => { const csv='transaction_id,lead_id,buyer,status,created_at,email,phone\nx,SYN-LEAD-20481,Northstar University,accepted,2026-08-16T00:00:00Z,person@example.com,5551234567'; const result=leadHoopAdapter.normalize(parseCsv(csv),mappings)[0]; expect(JSON.stringify(result.record)).not.toMatch(/person@example|5551234567/) })
})

describe('Release 4 outcome mapping', () => {
  const base={ externalOutcomeId:'o1',axisLeadId:'l1',externalLeadId:'',externalStatus:'Enrolled',occurredAt:'2026-08-16T00:00:00Z',monetaryValue:1200,currency:'USD',sourceSystem:'Synthetic CRM' }
  it('maps only explicitly configured CRM statuses', () => expect(crmOutcomeAdapter.normalize(base,release4Demo.outcomeMappings).outcome).toMatchObject({ outcomeType:'enrollment',monetaryValue:1200 }))
  it('rejects unmapped CRM statuses instead of guessing', () => { const result=crmOutcomeAdapter.normalize({ ...base,externalStatus:'Maybe Qualified' },release4Demo.outcomeMappings); expect(result.outcome).toBeNull(); expect(result.issues[0].code).toBe('UNMAPPED_OUTCOME') })
  it('requires an external outcome id', () => expect(crmOutcomeAdapter.normalize({ ...base,externalOutcomeId:'' },release4Demo.outcomeMappings).issues.map((issue) => issue.code)).toContain('MISSING_OUTCOME_ID'))
  it('requires a deterministic lead id', () => expect(crmOutcomeAdapter.normalize({ ...base,axisLeadId:'',externalLeadId:'' },release4Demo.outcomeMappings).outcome).toBeNull())
  it('rejects invalid outcome dates', () => expect(crmOutcomeAdapter.normalize({ ...base,occurredAt:'not-a-date' },release4Demo.outcomeMappings).issues.map((issue) => issue.code)).toContain('INVALID_DATE'))
})
