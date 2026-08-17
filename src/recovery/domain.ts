import type { Buyer, BuyerCap, BuyerProgram, BuyerRule, DeliveryAttempt, Lead, LeadOutcome, LeadRecovery, LeadRejection, RecoveryAttempt, RecoveryPath, RecoveryPolicy } from '../types'

const potentiallyRecoverable=new Set(['cap','program','geography','qualification','timeout','buyer_error'])
const complianceBlocked=new Set(['invalid_contact','compliance','suppression','consent'])
export type EligibilityCode='ELIGIBLE'|'BLOCKED_COMPLIANCE'|'NON_RECOVERABLE'|'MANUAL_REVIEW'|'LEAD_TOO_OLD'|'MAX_ATTEMPTS'|'NO_POLICY'|'NO_DESTINATION'
export interface RecoveryContext { tenantId:string;lead:Lead;rejection:LeadRejection;policies:RecoveryPolicy[];paths:RecoveryPath[];buyers:Buyer[];buyerPrograms:BuyerProgram[];buyerCaps:BuyerCap[];buyerRules:BuyerRule[];deliveryAttempts:DeliveryAttempt[];recoveryAttempts:RecoveryAttempt[];consent:{ status:'confirmed'|'missing'|'not_required'|'blocked';secondaryDeliveryAllowed:boolean };geography?:string;now?:Date }
export interface RankedRecoveryPath { path:RecoveryPath;buyer:Buyer|null;score:number;explanation:string[] }
export interface RecoveryEvaluation { code:EligibilityCode;recoverable:boolean;policy:RecoveryPolicy|null;paths:RankedRecoveryPath[];explanation:string[] }

const category=(value:string) => value.trim().toLowerCase().replace(/\s+/g,'_') || 'unknown'
export const defaultRecoverability=(value:string) => potentiallyRecoverable.has(category(value)) ? 'recoverable' : complianceBlocked.has(category(value)) ? 'blocked' : 'manual_review'
const withinCap=(cap:BuyerCap) => cap.status==='active' && cap.delivered<cap.limit
const activeCap=(caps:BuyerCap[],buyerId:string,programId:string|null) => caps.filter((cap) => cap.buyerId===buyerId && (!cap.programId || cap.programId===programId)).find(withinCap)

export function evaluateRecovery(context:RecoveryContext):RecoveryEvaluation {
  const now=context.now ?? new Date(); const rejectionCategory=category(context.rejection.category)
  const policies=context.policies.filter((row) => row.tenantId===context.tenantId && row.status==='active' && (row.rejectionCategory==='*' || category(row.rejectionCategory)===rejectionCategory) && (!row.programId || row.programId===context.lead.programId) && (!row.offerId || row.offerId===context.lead.offerId) && (!row.sourceBuyerId || row.sourceBuyerId===context.rejection.buyerId)).sort((a,b) => a.priority-b.priority)
  const policy=policies[0] ?? null; const base=defaultRecoverability(rejectionCategory)
  if (!policy) return { code:'NO_POLICY',recoverable:false,policy:null,paths:[],explanation:['No active tenant recovery policy matches this rejection.'] }
  if (base==='blocked' || context.consent.status==='blocked' || (policy.requireConsentConfirmation && (context.consent.status!=='confirmed' || !context.consent.secondaryDeliveryAllowed))) return { code:'BLOCKED_COMPLIANCE',recoverable:false,policy,paths:[],explanation:['Recovery is blocked because the configured consent gate is not satisfied.'] }
  if (base==='manual_review') return { code:'MANUAL_REVIEW',recoverable:false,policy,paths:[],explanation:['The rejection category requires an authorized operator review.'] }
  const ageMinutes=(now.getTime()-new Date(context.rejection.createdAt).getTime())/60000
  if (ageMinutes>policy.maxLeadAgeMinutes) return { code:'LEAD_TOO_OLD',recoverable:false,policy,paths:[],explanation:[`Lead age exceeds the configured ${policy.maxLeadAgeMinutes}-minute recovery limit.`] }
  const priorRecovery=context.recoveryAttempts.filter((row) => row.tenantId===context.tenantId && row.leadId===context.lead.id)
  if (priorRecovery.length>=policy.maxAttempts) return { code:'MAX_ATTEMPTS',recoverable:false,policy,paths:[],explanation:['Configured maximum recovery attempts has been reached.'] }
  const attemptedBuyers=new Set([...context.deliveryAttempts.filter((row) => row.tenantId===context.tenantId && row.leadId===context.lead.id).map((row) => row.buyerId),...priorRecovery.map((row) => row.buyerId).filter(Boolean) as string[]])
  const ranked:RankedRecoveryPath[]=[]
  for (const path of context.paths.filter((row) => row.tenantId===context.tenantId && row.recoveryPolicyId===policy.id && row.status==='active')) {
    if (path.pathType==='link_out' && !policy.allowLinkOut) continue
    if (['host_post','secondary_buyer'].includes(path.pathType) && !policy.allowSecondaryHostPost) continue
    const buyer=path.buyerId ? context.buyers.find((row) => row.id===path.buyerId && row.tenantId===context.tenantId) ?? null : null
    if (path.buyerId && !buyer) continue
    if (buyer && (buyer.status!=='active' || buyer.id===context.rejection.buyerId || attemptedBuyers.has(buyer.id))) continue
    const programId=path.programId ?? context.lead.programId
    const relationship=buyer ? context.buyerPrograms.find((row) => row.tenantId===context.tenantId && row.buyerId===buyer.id && row.programId===programId && row.status==='active') : undefined
    if (buyer && programId && !relationship) continue
    const cap=buyer ? activeCap(context.buyerCaps.filter((row) => row.tenantId===context.tenantId),buyer.id,programId) : undefined
    if (buyer && context.buyerCaps.some((row) => row.buyerId===buyer.id && (!row.programId || row.programId===programId)) && !cap) continue
    const geographyRule=buyer ? context.buyerRules.find((row) => row.tenantId===context.tenantId && row.buyerId===buyer.id && row.status==='active' && row.ruleType==='state') : undefined
    if (geographyRule && context.geography && !geographyRule.value.split(',').map((value) => value.trim().toLowerCase()).includes(context.geography.toLowerCase())) continue
    const payout=path.payoutOverride ?? relationship?.payout ?? buyer?.defaultPayout ?? 0; const remaining=cap ? cap.limit-cap.delivered : 0
    const score=10000-policy.priority*100-path.priority*10-(relationship?.priority ?? 100)+Math.min(remaining,500)+Math.round(payout)
    const explanation=[`Approved ${path.pathType.replace('_',' ')} path.`,...(buyer ? ['Buyer is active.','Program relationship is active.',cap ? `${remaining} leads remain in the configured allocation.`:'No active cap restriction applies.',`Configured value is $${payout}.`] : ['No outbound buyer delivery is required.'])]
    ranked.push({ path,buyer,score,explanation })
  }
  ranked.sort((a,b) => b.score-a.score || a.path.priority-b.path.priority)
  if (!ranked.length) return { code:'NO_DESTINATION',recoverable:false,policy,paths:[],explanation:['No approved destination passed tenant eligibility, cap, duplicate, and program rules.'] }
  return { code:'ELIGIBLE',recoverable:true,policy,paths:ranked,explanation:[`Rejection category ${rejectionCategory} is configured as recoverable.`,`${ranked.length} approved path${ranked.length===1?'':'s'} passed deterministic eligibility.`] }
}

export interface RecoveryIntelligence { rejected:number;recoverable:number;attempts:number;recovered:number;recoveryRate:number|null;revenue:number|null;averageValue:number|null;exhausted:number;blocked:number;downstreamConversions:number;revenuePerRejected:number|null;revenuePerRecoverable:number|null;revenuePerAttempt:number|null;contribution:number|null;funnel:{label:string;count:number}[];categories:{category:string;rejected:number;recoverable:number;attempted:number;recovered:number;rate:number|null;revenue:number|null}[] }
export function calculateRecoveryIntelligence(tenantId:string,rejections:LeadRejection[],recoveries:LeadRecovery[],attempts:RecoveryAttempt[],outcomes:LeadOutcome[]):RecoveryIntelligence {
  const tenantRejections=rejections.filter((row) => row.tenantId===tenantId);const tenantRecoveries=recoveries.filter((row) => row.tenantId===tenantId);const tenantAttempts=attempts.filter((row) => row.tenantId===tenantId)
  const recoveredRows=tenantRecoveries.filter((row) => row.status==='recovered');const hasRevenue=recoveredRows.some((row) => row.recoveryValue!=null);const revenue=hasRevenue ? recoveredRows.reduce((sum,row) => sum+(row.recoveryValue ?? 0),0):null;const costs=recoveredRows.filter((row) => row.incrementalCost!=null);const contribution=revenue!=null && costs.length===recoveredRows.length ? revenue-costs.reduce((sum,row) => sum+(row.incrementalCost ?? 0),0):null
  const recoveryIds=new Set(tenantRecoveries.map((row) => row.leadId));const downstream=new Set(outcomes.filter((row) => row.tenantId===tenantId && recoveryIds.has(row.leadId) && ['enrollment','sale','completed'].includes(row.outcomeType)).map((row) => row.leadId)).size
  const byCategory=new Map<string,{category:string;rejected:number;recoverable:number;attempted:number;recovered:number;revenue:number|null}>();for(const rejection of tenantRejections){const key=category(rejection.category);const item=byCategory.get(key) ?? {category:key,rejected:0,recoverable:0,attempted:0,recovered:0,revenue:null};item.rejected++;const related=tenantRecoveries.filter((row) => row.originatingRejectionId===rejection.id);item.recoverable+=related.filter((row) => !['blocked','cancelled'].includes(row.status)).length;item.attempted+=related.filter((row) => tenantAttempts.some((attempt) => attempt.leadRecoveryId===row.id && !['pending','eligible','skipped','blocked'].includes(attempt.status))).length;item.recovered+=related.filter((row) => row.status==='recovered').length;const values=related.filter((row) => row.recoveryValue!=null);if(values.length)item.revenue=(item.revenue ?? 0)+values.reduce((sum,row) => sum+(row.recoveryValue ?? 0),0);byCategory.set(key,item)}
  const recoverable=tenantRecoveries.filter((row) => !['blocked','cancelled'].includes(row.status)).length;const attemptedRecoveries=new Set(tenantAttempts.filter((row) => !['pending','eligible','skipped','blocked'].includes(row.status)).map((row) => row.leadRecoveryId)).size
  return { rejected:tenantRejections.length,recoverable,attempts:tenantAttempts.length,recovered:recoveredRows.length,recoveryRate:attemptedRecoveries ? recoveredRows.length/attemptedRecoveries*100:null,revenue,averageValue:revenue!=null && recoveredRows.length ? revenue/recoveredRows.length:null,exhausted:tenantRecoveries.filter((row) => row.status==='exhausted').length,blocked:tenantRecoveries.filter((row) => row.status==='blocked').length,downstreamConversions:downstream,revenuePerRejected:revenue!=null && tenantRejections.length ? revenue/tenantRejections.length:null,revenuePerRecoverable:revenue!=null && recoverable ? revenue/recoverable:null,revenuePerAttempt:revenue!=null && tenantAttempts.length ? revenue/tenantAttempts.length:null,contribution,funnel:[{label:'Rejected',count:tenantRejections.length},{label:'Recoverable',count:recoverable},{label:'Attempted',count:attemptedRecoveries},{label:'Recovered',count:recoveredRows.length},{label:'Downstream conversion',count:downstream}],categories:[...byCategory.values()].map((row) => ({...row,rate:row.attempted ? row.recovered/row.attempted*100:null})) }
}
