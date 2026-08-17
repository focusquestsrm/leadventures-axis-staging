import type { Buyer, DeliveryAttempt, Lead } from '../types'
import type { CanonicalDeliveryRecord, LeadMatch } from './contracts'

export function matchLead(record: CanonicalDeliveryRecord, leads: Lead[]): LeadMatch {
  if (record.axisLeadId) { const exact=leads.filter((lead) => lead.id===record.axisLeadId); if (exact.length===1) return { status:'matched',lead:exact[0],reason:'Matched by Axis lead ID.' }; if (exact.length>1) return { status:'requires_review',lead:null,reason:'Axis lead ID was ambiguous.' } }
  if (record.externalLeadId) { const exact=leads.filter((lead) => lead.externalLeadId===record.externalLeadId); if (exact.length===1) return { status:'matched',lead:exact[0],reason:'Matched by trusted external lead ID.' }; if (exact.length>1) return { status:'requires_review',lead:null,reason:'Trusted external lead ID matched multiple records.' } }
  return { status:'unmatched',lead:null,reason:'No deterministic operational identifier matched.' }
}

export function matchBuyer(record: CanonicalDeliveryRecord, buyers: Buyer[]) { const normalized=record.buyer.trim().toLowerCase(); const matches=buyers.filter((buyer) => buyer.name.toLowerCase()===normalized || buyer.externalReference.toLowerCase()===normalized); return matches.length===1 ? matches[0] : null }
export function isDuplicate(record: CanonicalDeliveryRecord, attempts: DeliveryAttempt[]) { return attempts.some((attempt) => attempt.externalReference===record.externalTransactionId) }
