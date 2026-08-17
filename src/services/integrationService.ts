import { release4Demo } from '../data/release4Demo'
import { parseCsv } from '../integrations/csv'
import type { ImportPreview } from '../integrations/contracts'
import { leadHoopAdapter } from '../integrations/leadhoopAdapter'
import { isDuplicate, matchBuyer, matchLead } from '../integrations/matching'
import { demoMode, supabase } from '../lib/supabase'
import type { Buyer, DeliveryAttempt, IntegrationFieldMapping, IntegrationImportBatch, IntegrationImportError, IntegrationSyncRun, Lead, OutcomeMapping } from '../types'

export interface IntegrationWorkspace { fieldMappings: IntegrationFieldMapping[]; importBatches: IntegrationImportBatch[]; importErrors: IntegrationImportError[]; syncRuns: IntegrationSyncRun[]; outcomeMappings: OutcomeMapping[] }
export interface PreviewContext { tenantId: string; mappings: IntegrationFieldMapping[]; leads: Lead[]; buyers: Buyer[]; attempts: DeliveryAttempt[] }

const scope = <T extends { tenantId: string }>(rows: T[],tenantId: string) => structuredClone(rows.filter((row) => row.tenantId===tenantId))

export function previewLeadHoopImport(csv: string,context: PreviewContext): ImportPreview {
  if (new Blob([csv]).size > 5_000_000) throw new Error('Files larger than 5 MB require the background import service.')
  const raw=parseCsv(csv); const normalized=leadHoopAdapter.normalize(raw,context.mappings)
  const rows=normalized.map(({ record,issues },index) => {
    if (!record) return { rowNumber:index+2,record:null,issues,matchStatus:'unmatched' as const,leadId:null,buyerId:null }
    const duplicate=isDuplicate(record,context.attempts); const leadMatch=matchLead(record,context.leads.filter((lead) => lead.tenantId===context.tenantId)); const buyer=matchBuyer(record,context.buyers.filter((item) => item.tenantId===context.tenantId))
    if (!buyer) issues.push({ code:'UNKNOWN_BUYER',message:'Buyer did not match a configured tenant destination.',severity:'error' as const })
    const matchStatus=duplicate ? 'duplicate' as const : leadMatch.status
    return { rowNumber:record.rowNumber,record,issues,matchStatus,leadId:leadMatch.lead?.id ?? null,buyerId:buyer?.id ?? null }
  })
  return { rowsDetected:rows.length,validRows:rows.filter((row) => !row.issues.some((issue) => issue.severity==='error')).length,invalidRows:rows.filter((row) => row.issues.some((issue) => issue.severity==='error')).length,duplicates:rows.filter((row) => row.matchStatus==='duplicate').length,matchedLeads:rows.filter((row) => row.matchStatus==='matched').length,unmatchedLeads:rows.filter((row) => row.matchStatus==='unmatched' || row.matchStatus==='requires_review').length,warnings:rows.reduce((sum,row) => sum+row.issues.filter((issue) => issue.severity==='warning').length,0),rows }
}

export const integrationService = {
  async getWorkspace(tenantId: string,integrationId: string): Promise<IntegrationWorkspace> {
    if (demoMode) return { fieldMappings:scope(release4Demo.fieldMappings,tenantId).filter((row) => row.integrationId===integrationId),importBatches:scope(release4Demo.importBatches,tenantId).filter((row) => row.integrationId===integrationId),importErrors:scope(release4Demo.importErrors,tenantId).filter((row) => row.integrationId===integrationId),syncRuns:scope(release4Demo.syncRuns,tenantId).filter((row) => row.integrationId===integrationId),outcomeMappings:scope(release4Demo.outcomeMappings,tenantId).filter((row) => row.integrationId===integrationId) }
    if (!supabase) throw new Error('Supabase is not configured.')
    const [mappings,batches,errors,syncs,outcomes]=await Promise.all([
      supabase.from('integration_field_mappings').select('id,tenant_id,integration_id,external_field,axis_field,required,transform,updated_at').eq('tenant_id',tenantId).eq('integration_id',integrationId).order('external_field'),
      supabase.from('integration_import_batches').select('id,tenant_id,integration_id,file_name,status,rows_received,rows_valid,rows_invalid,rows_imported,rows_duplicate,rows_unmatched,started_at,completed_at,created_at').eq('tenant_id',tenantId).eq('integration_id',integrationId).order('created_at',{ ascending:false }),
      supabase.from('integration_import_errors').select('id,tenant_id,integration_id,import_batch_id,row_number,error_code,safe_message,resolution_status,created_at').eq('tenant_id',tenantId).eq('integration_id',integrationId).order('row_number'),
      supabase.from('integration_sync_runs').select('id,tenant_id,integration_id,status,records_processed,records_created,records_updated,records_skipped,records_errored,duration_ms,started_at,completed_at').eq('tenant_id',tenantId).eq('integration_id',integrationId).order('started_at',{ ascending:false }),
      supabase.from('outcome_mappings').select('id,tenant_id,integration_id,external_value,outcome_type,outcome_stage,active,updated_at').eq('tenant_id',tenantId).eq('integration_id',integrationId).order('external_value'),
    ])
    for (const result of [mappings,batches,errors,syncs,outcomes]) if (result.error) throw result.error
    return {
      fieldMappings:(mappings.data ?? []).map((row) => ({ id:row.id,tenantId:row.tenant_id,integrationId:row.integration_id,externalField:row.external_field,axisField:row.axis_field,required:row.required,transform:row.transform,updatedAt:row.updated_at })),
      importBatches:(batches.data ?? []).map((row) => ({ id:row.id,tenantId:row.tenant_id,integrationId:row.integration_id,fileName:row.file_name,status:row.status as IntegrationImportBatch['status'],rowsReceived:row.rows_received,rowsValid:row.rows_valid,rowsInvalid:row.rows_invalid,rowsImported:row.rows_imported,rowsDuplicate:row.rows_duplicate,rowsUnmatched:row.rows_unmatched,startedAt:row.started_at,completedAt:row.completed_at,createdAt:row.created_at })),
      importErrors:(errors.data ?? []).map((row) => ({ id:row.id,tenantId:row.tenant_id,integrationId:row.integration_id,importBatchId:row.import_batch_id,rowNumber:row.row_number,errorCode:row.error_code,safeMessage:row.safe_message,resolutionStatus:row.resolution_status as IntegrationImportError['resolutionStatus'],createdAt:row.created_at })),
      syncRuns:(syncs.data ?? []).map((row) => ({ id:row.id,tenantId:row.tenant_id,integrationId:row.integration_id,status:row.status as IntegrationSyncRun['status'],recordsProcessed:row.records_processed,recordsCreated:row.records_created,recordsUpdated:row.records_updated,recordsSkipped:row.records_skipped,recordsErrored:row.records_errored,durationMs:row.duration_ms,startedAt:row.started_at,completedAt:row.completed_at })),
      outcomeMappings:(outcomes.data ?? []).map((row) => ({ id:row.id,tenantId:row.tenant_id,integrationId:row.integration_id,externalValue:row.external_value,outcomeType:row.outcome_type as OutcomeMapping['outcomeType'],outcomeStage:row.outcome_stage,active:row.active,updatedAt:row.updated_at })),
    }
  },
  async finalizePreview(tenantId: string,integrationId: string,fileName: string,preview: ImportPreview) {
    if (demoMode) return { batchId:`demo-${Date.now()}`,status:preview.invalidRows || preview.unmatchedLeads ? 'completed_with_errors' : 'completed' }
    if (!supabase) throw new Error('Supabase is not configured.')
    const safeRows=preview.rows.map((row) => ({ row_number:row.rowNumber,external_transaction_id:row.record?.externalTransactionId ?? null,lead_id:row.leadId,buyer_id:row.buyerId,status:row.record?.status ?? null,rejection_reason:row.record?.rejectionReason || null,response_time_ms:row.record?.responseTimeMs ?? null,payout:row.record?.payout ?? null,occurred_at:row.record?.occurredAt ?? null,match_status:row.matchStatus,issues:row.issues.map((issue) => ({ code:issue.code,severity:issue.severity })) }))
    const { data,error }=await supabase.rpc('axis_finalize_leadhoop_import',{ p_tenant_id:tenantId,p_integration_id:integrationId,p_file_name:fileName,p_rows:safeRows })
    if (error) throw error
    return data as { batchId:string;status:string }
  },
}
