import type { DeliveryAttempt, Lead, LeadDelivery, LeadRejection, LeadStatusEvent } from '../types'

const tenantId = '10000000-0000-4000-8000-000000000001'
const categories = ['cap','duplicate','geography','qualification','timeout','buyer_error']
const recoverableCategories = new Set(['cap','geography','timeout','buyer_error'])

const leads: Lead[] = []
const leadDeliveries: LeadDelivery[] = []
const deliveryAttempts: DeliveryAttempt[] = []
const leadRejections: LeadRejection[] = []
const leadStatusHistory: LeadStatusEvent[] = []

for (let index = 0; index < 36; index++) {
  const received = new Date(Date.UTC(2026, 7, 15 - index * 2, 10 + (index % 6), index % 60))
  const leadId = `r3-lead-${index}`; const deliveryId = `r3-delivery-${index}`; const attemptId = `r3-attempt-${index}`
  const sourceNumber = index % 3 === 0 ? 1 : 2; const campaignNumber = index % 3 === 2 ? 2 : 1; const programNumber = (index % 3) + 1; const buyerNumber = (index % 3) + 1
  const status: Lead['status'] = index % 7 === 0 ? 'validated' : index % 3 === 0 ? 'rejected' : 'accepted'
  leads.push({ id:leadId,tenantId,reference:`AX-R3-${String(index + 1).padStart(3,'0')}`,externalLeadId:`SYN-R3-${index + 1}`,trafficSourceId:`ts${sourceNumber}`,campaignId:`c${campaignNumber}`,programId:`p${programNumber}`,offerId:`o${programNumber}`,program:['Medical Assistant','Pharmacy Technician','Psychology'][programNumber - 1],source:sourceNumber === 1 ? 'Meta' : 'Google',campaign:campaignNumber === 1 ? 'Healthcare Careers' : 'Psychology Programs',offer:['Qualified Healthcare Inquiry','Pharmacy Technician Interest','Psychology Program Inquiry'][programNumber - 1],status,score:62 + (index * 7) % 35,receivedAt:received.toISOString(),createdAt:received.toISOString() })
  leadStatusHistory.push({ id:`r3-status-${index}`,tenantId,leadId,fromStatus:null,toStatus:status,reason:'Synthetic Release 3 lifecycle outcome',changedBy:null,createdAt:received.toISOString() })
  if (status === 'validated') continue
  const attempted = new Date(received.getTime() + 45_000); const responseMs = status === 'rejected' && index % 5 === 0 ? 30_000 : 420 + (index * 173) % 3_600; const attemptStatus: DeliveryAttempt['status'] = responseMs === 30_000 ? 'timeout' : status
  leadDeliveries.push({ id:deliveryId,tenantId,leadId,status:status === 'accepted' ? 'accepted' : 'exhausted',startedAt:attempted.toISOString(),completedAt:new Date(attempted.getTime()+responseMs).toISOString(),createdAt:attempted.toISOString() })
  deliveryAttempts.push({ id:attemptId,tenantId,deliveryId,leadId,buyerId:`b${buyerNumber}`,offerId:`o${programNumber}`,programId:`p${programNumber}`,attemptNumber:1,deliveryMethod:buyerNumber === 1 ? 'ping_post' : 'host_post',status:attemptStatus,requestStartedAt:attempted.toISOString(),responseReceivedAt:attemptStatus === 'timeout' ? null : new Date(attempted.getTime()+responseMs).toISOString(),responseTimeMs:responseMs,externalReference:`SYN-R3-ATT-${index + 1}`,payout:status === 'accepted' ? 48 + buyerNumber * 5 : null,createdAt:attempted.toISOString() })
  if (status === 'rejected') { const category = categories[index % categories.length]; leadRejections.push({ id:`r3-rejection-${index}`,tenantId,leadId,deliveryAttemptId:attemptId,buyerId:`b${buyerNumber}`,rejectionCode:`SYN_${category.toUpperCase()}`,category,reason:`Synthetic ${category.replace('_',' ')} rejection`,recoverable:recoverableCategories.has(category),createdAt:new Date(attempted.getTime()+responseMs).toISOString() }) }
}

export const release3Demo = { leads, leadDeliveries, deliveryAttempts, leadRejections, leadStatusHistory }
