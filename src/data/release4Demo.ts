import type { IntegrationFieldMapping, IntegrationImportBatch, IntegrationImportError, IntegrationSyncRun, LeadOutcome, OutcomeMapping } from '../types'

const tenantId = '10000000-0000-4000-8000-000000000001'
const integrationId = 'i-leadhoop'
const crmIntegrationId = 'i-crm'

export const leadHoopDemoCsv = `transaction_id,lead_id,campaign,buyer,status,reject_reason,response_ms,payout,created_at
LH-DEMO-001,SYN-LEAD-20481,Healthcare Careers,Northstar University,accepted,,842,62,2026-08-16T13:43:01Z
LH-DEMO-002,SYN-LEAD-20480,Healthcare Careers,Northstar University,rejected,cap,620,,2026-08-16T13:19:01Z
LH-DEMO-003,SYN-R3-4,Healthcare Careers,Meridian Career Institute,rejected,duplicate,1180,,2026-08-09T10:00:00Z
LH-DEMO-004,SYN-R3-7,Psychology Programs,Summit Online,rejected,geography,910,,2026-08-05T10:00:00Z
LH-DEMO-005,SYN-R3-10,Healthcare Careers,Summit Online,timeout,timeout,30000,,2026-08-01T10:00:00Z
LH-DEMO-006,SYN-LEAD-20481,Healthcare Careers,Meridian Career Institute,accepted,,1640,58,2026-08-16T13:43:04Z`

export const release4Demo: {
  fieldMappings: IntegrationFieldMapping[]; importBatches: IntegrationImportBatch[]; importErrors: IntegrationImportError[]
  syncRuns: IntegrationSyncRun[]; outcomes: LeadOutcome[]; outcomeMappings: OutcomeMapping[]
} = {
  fieldMappings: [
    { id:'fm1',tenantId,integrationId,externalField:'transaction_id',axisField:'external_transaction_id',required:true,transform:'trim',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm2',tenantId,integrationId,externalField:'lead_id',axisField:'external_lead_id',required:true,transform:'trim',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm3',tenantId,integrationId,externalField:'buyer',axisField:'buyer',required:true,transform:'trim',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm4',tenantId,integrationId,externalField:'status',axisField:'delivery_status',required:true,transform:'lowercase',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm5',tenantId,integrationId,externalField:'reject_reason',axisField:'rejection_reason',required:false,transform:'lowercase',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm6',tenantId,integrationId,externalField:'response_ms',axisField:'response_time_ms',required:false,transform:'integer',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm7',tenantId,integrationId,externalField:'payout',axisField:'payout',required:false,transform:'decimal',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm8',tenantId,integrationId,externalField:'campaign',axisField:'campaign',required:false,transform:'trim',updatedAt:'2026-08-16T14:00:00Z' },
    { id:'fm9',tenantId,integrationId,externalField:'created_at',axisField:'occurred_at',required:true,transform:'datetime',updatedAt:'2026-08-16T14:00:00Z' },
  ],
  importBatches: [{ id:'batch1',tenantId,integrationId,fileName:'leadhoop-demo-2026-08-16.csv',status:'completed_with_errors',rowsReceived:6,rowsValid:6,rowsInvalid:0,rowsImported:5,rowsDuplicate:1,rowsUnmatched:1,startedAt:'2026-08-16T14:00:00Z',completedAt:'2026-08-16T14:00:04Z',createdAt:'2026-08-16T14:00:00Z' }],
  importErrors: [{ id:'err1',tenantId,integrationId,importBatchId:'batch1',rowNumber:5,errorCode:'LEAD_NOT_FOUND',safeMessage:'No operational lead matched the trusted external identifier.',resolutionStatus:'open',createdAt:'2026-08-16T14:00:03Z' }],
  syncRuns: [{ id:'sync1',tenantId,integrationId,status:'completed',recordsProcessed:6,recordsCreated:5,recordsUpdated:0,recordsSkipped:1,recordsErrored:0,durationMs:4180,startedAt:'2026-08-16T14:00:00Z',completedAt:'2026-08-16T14:00:04Z' }],
  outcomes: [
    { id:'out1',tenantId,leadId:'l1',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-001',outcomeType:'contacted',outcomeStage:'Contacted',status:'completed',occurredAt:'2026-08-16T15:00:00Z',monetaryValue:null,currency:'USD',programId:'p1',buyerId:'b2',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-001',ingestedAt:'2026-08-16T15:05:00Z',createdAt:'2026-08-16T15:05:00Z' },
    { id:'out2',tenantId,leadId:'l1',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-002',outcomeType:'application',outcomeStage:'Application',status:'completed',occurredAt:'2026-08-16T16:00:00Z',monetaryValue:null,currency:'USD',programId:'p1',buyerId:'b2',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-002',ingestedAt:'2026-08-16T16:05:00Z',createdAt:'2026-08-16T16:05:00Z' },
    { id:'out3',tenantId,leadId:'l1',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-003',outcomeType:'enrollment',outcomeStage:'Conversion',status:'completed',occurredAt:'2026-08-17T11:00:00Z',monetaryValue:1200,currency:'USD',programId:'p1',buyerId:'b2',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-003',ingestedAt:'2026-08-17T11:05:00Z',createdAt:'2026-08-17T11:05:00Z' },
    { id:'out4',tenantId,leadId:'l1',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-004',outcomeType:'start',outcomeStage:'Start',status:'completed',occurredAt:'2026-08-20T09:00:00Z',monetaryValue:null,currency:'USD',programId:'p1',buyerId:'b2',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-004',ingestedAt:'2026-08-20T09:05:00Z',createdAt:'2026-08-20T09:05:00Z' },
    { id:'out5',tenantId,leadId:'r3-lead-1',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-005',outcomeType:'contacted',outcomeStage:'Contacted',status:'completed',occurredAt:'2026-08-14T12:00:00Z',monetaryValue:null,currency:'USD',programId:'p2',buyerId:'b2',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-005',ingestedAt:'2026-08-14T12:05:00Z',createdAt:'2026-08-14T12:05:00Z' },
    { id:'out6',tenantId,leadId:'r3-lead-1',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-006',outcomeType:'lost',outcomeStage:'Closed',status:'completed',occurredAt:'2026-08-15T12:00:00Z',monetaryValue:null,currency:'USD',programId:'p2',buyerId:'b2',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-006',ingestedAt:'2026-08-15T12:05:00Z',createdAt:'2026-08-15T12:05:00Z' },
    { id:'out7',tenantId,leadId:'r3-lead-2',integrationId:crmIntegrationId,importBatchId:null,externalOutcomeId:'CRM-OUT-007',outcomeType:'application',outcomeStage:'Application',status:'completed',occurredAt:'2026-08-12T12:00:00Z',monetaryValue:null,currency:'USD',programId:'p3',buyerId:'b3',sourceSystem:'Synthetic CRM',externalRecordId:'CRM-OUT-007',ingestedAt:'2026-08-12T12:05:00Z',createdAt:'2026-08-12T12:05:00Z' },
  ],
  outcomeMappings: [
    { id:'om1',tenantId,integrationId:crmIntegrationId,externalValue:'Application Submitted',outcomeType:'application',outcomeStage:'Application',active:true,updatedAt:'2026-08-16T14:00:00Z' },
    { id:'om2',tenantId,integrationId:crmIntegrationId,externalValue:'Enrolled',outcomeType:'enrollment',outcomeStage:'Conversion',active:true,updatedAt:'2026-08-16T14:00:00Z' },
    { id:'om3',tenantId,integrationId:crmIntegrationId,externalValue:'Started',outcomeType:'start',outcomeStage:'Start',active:true,updatedAt:'2026-08-16T14:00:00Z' },
  ],
}
