import type { OutcomeMapping } from '../types'
import type { ExternalOutcomeRecord, ImportRowIssue, OutcomeAdapter } from './contracts'

export const crmOutcomeAdapter: OutcomeAdapter = {
  normalize(record: ExternalOutcomeRecord,mappings: OutcomeMapping[]) {
    const issues: ImportRowIssue[]=[]; const mapping=mappings.find((item) => item.active && item.externalValue.toLowerCase()===record.externalStatus.trim().toLowerCase())
    if (!record.externalOutcomeId) issues.push({ code:'MISSING_OUTCOME_ID',message:'External outcome identifier is required.',severity:'error' })
    if (!record.axisLeadId && !record.externalLeadId) issues.push({ code:'MISSING_LEAD_IDENTIFIER',message:'A deterministic lead identifier is required.',severity:'error' })
    if (!mapping) issues.push({ code:'UNMAPPED_OUTCOME',message:'External outcome status requires an explicit canonical mapping.',severity:'error' })
    const occurredAt=new Date(record.occurredAt); if (Number.isNaN(occurredAt.getTime())) issues.push({ code:'INVALID_DATE',message:'Outcome date is invalid.',severity:'error' })
    if (issues.some((issue) => issue.severity==='error') || !mapping) return { outcome:null,issues }
    return { outcome:{ externalOutcomeId:record.externalOutcomeId,outcomeType:mapping.outcomeType,outcomeStage:mapping.outcomeStage,status:'completed',occurredAt:occurredAt.toISOString(),monetaryValue:record.monetaryValue,currency:record.currency || 'USD',sourceSystem:record.sourceSystem,externalRecordId:record.externalOutcomeId },issues }
  },
}
