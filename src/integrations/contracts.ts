import type { DeliveryStatus, IntegrationFieldMapping, Lead, LeadOutcome, OutcomeMapping } from '../types'

export interface CanonicalDeliveryRecord {
  rowNumber: number
  externalTransactionId: string
  axisLeadId: string
  externalLeadId: string
  campaign: string
  buyer: string
  status: DeliveryStatus
  rejectionReason: string
  responseTimeMs: number | null
  payout: number | null
  occurredAt: string
  sourceSystem: string
}

export interface ImportRowIssue { code: string; message: string; severity: 'error' | 'warning' }
export interface ImportPreviewRow { rowNumber: number; record: CanonicalDeliveryRecord | null; issues: ImportRowIssue[]; matchStatus: 'matched' | 'unmatched' | 'requires_review' | 'duplicate'; leadId: string | null; buyerId: string | null }
export interface ImportPreview { rowsDetected: number; validRows: number; invalidRows: number; duplicates: number; matchedLeads: number; unmatchedLeads: number; warnings: number; rows: ImportPreviewRow[] }
export interface LeadMatch { status: ImportPreviewRow['matchStatus']; lead: Lead | null; reason: string }
export interface ExternalOutcomeRecord { externalOutcomeId: string; externalContactId?: string; axisLeadId: string; externalLeadId: string; externalStatus: string; status?: string; stage?: string; outcome?: string; occurredAt: string; monetaryValue: number | null; currency: string; programReference?: string; buyerReference?: string; sourceReference?: string; campaignReference?: string; updatedAt?: string; sourceSystem: string }
export interface NormalizedOutcome extends Omit<LeadOutcome,'id'|'tenantId'|'integrationId'|'importBatchId'|'leadId'|'programId'|'buyerId'|'createdAt'|'ingestedAt'|'externalRecordId'> { externalRecordId: string }

export interface IntegrationAdapter {
  vendor: string
  category: string
  normalize(rows: Record<string,string>[], mappings: IntegrationFieldMapping[]): { record: CanonicalDeliveryRecord | null; issues: ImportRowIssue[] }[]
}

export interface OutcomeAdapter { normalize(record: ExternalOutcomeRecord, mappings: OutcomeMapping[]): { outcome: NormalizedOutcome | null; issues: ImportRowIssue[] } }
