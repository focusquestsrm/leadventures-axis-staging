import type { IntegrationFieldMapping } from '../types'
import type { CanonicalDeliveryRecord, ImportRowIssue, IntegrationAdapter } from './contracts'

const allowedStatuses = new Set(['pending','accepted','rejected','timeout','error','cancelled'])
const mappedValue = (row: Record<string,string>, mappings: IntegrationFieldMapping[], axisField: string) => { const mapping=mappings.find((item) => item.axisField===axisField); const raw=mapping ? row[mapping.externalField] ?? '' : ''; if (mapping?.transform==='lowercase') return raw.trim().toLowerCase(); return raw.trim() }

export const leadHoopAdapter: IntegrationAdapter = {
  vendor:'LeadHoop',category:'lead_distribution',
  normalize(rows,mappings) {
    return rows.map((row,index) => {
      const issues: ImportRowIssue[]=[]
      const externalTransactionId=mappedValue(row,mappings,'external_transaction_id'); const axisLeadId=mappedValue(row,mappings,'axis_lead_id'); const externalLeadId=mappedValue(row,mappings,'external_lead_id'); const buyer=mappedValue(row,mappings,'buyer'); const status=mappedValue(row,mappings,'delivery_status').toLowerCase(); const responseRaw=mappedValue(row,mappings,'response_time_ms'); const payoutRaw=mappedValue(row,mappings,'payout'); const occurredRaw=mappedValue(row,mappings,'occurred_at') || row.created_at?.trim() || ''
      if (!externalTransactionId) issues.push({ code:'MISSING_TRANSACTION_ID',message:'Missing required external transaction identifier.',severity:'error' })
      if (!axisLeadId && !externalLeadId) issues.push({ code:'MISSING_LEAD_IDENTIFIER',message:'An Axis or trusted external lead identifier is required.',severity:'error' })
      if (!buyer) issues.push({ code:'MISSING_BUYER',message:'A buyer or destination identifier is required.',severity:'error' })
      if (!allowedStatuses.has(status)) issues.push({ code:'INVALID_STATUS',message:'Delivery status is not recognized.',severity:'error' })
      const responseTimeMs=responseRaw==='' ? null : Number(responseRaw); if (responseTimeMs != null && (!Number.isInteger(responseTimeMs) || responseTimeMs<0)) issues.push({ code:'INVALID_RESPONSE_TIME',message:'Response time must be a non-negative integer.',severity:'error' })
      const payout=payoutRaw==='' ? null : Number(payoutRaw); if (payout != null && (!Number.isFinite(payout) || payout<0)) issues.push({ code:'INVALID_PAYOUT',message:'Payout must be a non-negative amount.',severity:'error' })
      const occurredAt=new Date(occurredRaw); if (!occurredRaw || Number.isNaN(occurredAt.getTime())) issues.push({ code:'INVALID_DATE',message:'A valid delivery timestamp is required.',severity:'error' })
      if (status==='rejected' && !mappedValue(row,mappings,'rejection_reason')) issues.push({ code:'MISSING_REJECTION_REASON',message:'Rejected row has no structured reason and will remain unclassified.',severity:'warning' })
      if (issues.some((issue) => issue.severity==='error')) return { record:null,issues }
      const record: CanonicalDeliveryRecord={ rowNumber:index+2,externalTransactionId,axisLeadId,externalLeadId,campaign:mappedValue(row,mappings,'campaign'),buyer,status:status as CanonicalDeliveryRecord['status'],rejectionReason:mappedValue(row,mappings,'rejection_reason'),responseTimeMs,payout,occurredAt:occurredAt.toISOString(),sourceSystem:'LeadHoop' }
      return { record,issues }
    })
  },
}
