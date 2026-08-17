import { describe,expect,it } from 'vitest'
import { release2Demo } from '../data/release2Demo'
import { release5Demo } from '../data/release5Demo'
import type { Buyer,LeadRecovery,RecoveryAttempt,RecoveryPath } from '../types'
import { calculateRecoveryIntelligence,defaultRecoverability,evaluateRecovery } from './domain'

const tenantId='10000000-0000-4000-8000-000000000001'
const buyers:Buyer[]=[
  {id:'b1',tenantId,name:'Primary',externalReference:'PRIMARY',notes:'',status:'active',buyerType:'education',deliveryMethod:'ping_post',defaultPayout:62,currency:'USD',duplicateWindowDays:30,exclusive:false,timezone:'UTC',offers:1,updatedAt:'2026-08-16T16:00:00Z'},
  {id:'b2',tenantId,name:'Secondary B',externalReference:'B2',notes:'',status:'active',buyerType:'education',deliveryMethod:'host_post',defaultPayout:58,currency:'USD',duplicateWindowDays:30,exclusive:false,timezone:'UTC',offers:1,updatedAt:'2026-08-16T16:00:00Z'},
  {id:'b3',tenantId,name:'Secondary C',externalReference:'B3',notes:'',status:'active',buyerType:'education',deliveryMethod:'host_post',defaultPayout:54,currency:'USD',duplicateWindowDays:30,exclusive:false,timezone:'UTC',offers:1,updatedAt:'2026-08-16T16:00:00Z'},
]
const context=()=>({tenantId,lead:release5Demo.leads[0],rejection:release5Demo.rejections[0],policies:release5Demo.policies,paths:release5Demo.paths,buyers,buyerPrograms:release2Demo.buyerPrograms,buyerCaps:release2Demo.buyerCaps,buyerRules:release2Demo.buyerRules,deliveryAttempts:release5Demo.primaryDeliveryAttempts,recoveryAttempts:[] as RecoveryAttempt[],consent:{status:'confirmed' as LeadRecovery['consentStatus'],secondaryDeliveryAllowed:true},now:new Date('2026-08-16T16:30:00Z')})

describe('Release 5 deterministic recovery domain',()=>{
  it('classifies selected operational rejection categories as recoverable',()=>expect(defaultRecoverability('cap')).toBe('recoverable'))
  it('classifies compliance rejections as blocked',()=>expect(defaultRecoverability('compliance')).toBe('blocked'))
  it('sends unknown categories to manual review',()=>expect(defaultRecoverability('unmapped')).toBe('manual_review'))
  it('finds an eligible approved secondary destination',()=>{const result=evaluateRecovery(context());expect(result.code).toBe('ELIGIBLE');expect(result.paths[0].path.id).toBe('path-cap-b3')})
  it('never recommends the original buyer',()=>expect(evaluateRecovery(context()).paths.some((row)=>row.path.buyerId==='b1')).toBe(false))
  it('excludes a buyer without an active program relationship',()=>expect(evaluateRecovery(context()).paths.some((row)=>row.path.buyerId==='b2')).toBe(false))
  it('excludes a destination whose applicable cap is exhausted',()=>{const input=context();input.buyerCaps=input.buyerCaps.map((row)=>row.buyerId==='b3'?{...row,delivered:row.limit}:row);expect(evaluateRecovery(input).paths.some((row)=>row.path.buyerId==='b3')).toBe(false)})
  it('excludes a buyer already attempted for the lead',()=>{const input=context();input.deliveryAttempts=[...input.deliveryAttempts,{...input.deliveryAttempts[0],id:'prior-b3',buyerId:'b3'}];expect(evaluateRecovery(input).paths.some((row)=>row.path.buyerId==='b3')).toBe(false)})
  it('blocks recovery when required consent is missing',()=>{const input=context();input.consent={status:'missing',secondaryDeliveryAllowed:false};expect(evaluateRecovery(input).code).toBe('BLOCKED_COMPLIANCE')})
  it('enforces the configured lead age boundary',()=>{const input=context();input.now=new Date('2026-08-16T20:00:00Z');expect(evaluateRecovery(input).code).toBe('LEAD_TOO_OLD')})
  it('enforces the configured maximum attempts',()=>{const input=context();input.recoveryAttempts=[0,1,2].map((index)=>({...release5Demo.attempts[0],id:`prior-${index}`,transactionKey:`prior-${index}`}));expect(evaluateRecovery(input).code).toBe('MAX_ATTEMPTS')})
  it('isolates paths by tenant even when identifiers otherwise match',()=>{const input=context();input.paths=input.paths.map((row)=>({...row,tenantId:'other-tenant'}));expect(evaluateRecovery(input).code).toBe('NO_DESTINATION')})
  it('rejects a cross-tenant buyer relation',()=>{const input=context();input.buyers=input.buyers.map((row)=>row.id==='b3'?{...row,tenantId:'other-tenant'}:row);expect(evaluateRecovery(input).paths.some((row)=>row.path.buyerId==='b3')).toBe(false)})
  it('keeps explanations free of common identity fields',()=>{const output=JSON.stringify(evaluateRecovery(context()));expect(output).not.toMatch(/email|phone|first_name|last_name|auth token|jwt/i)})
  it('honors path-type policy gates',()=>{const input=context();const link:RecoveryPath={...input.paths[0],id:'link',buyerId:null,pathType:'link_out',destinationReference:'opaque-campaign'};input.paths=[link];expect(evaluateRecovery(input).code).toBe('NO_DESTINATION')})
})

describe('Release 5 recovery intelligence',()=>{
  it('calculates recovery rate and trusted recovered revenue',()=>{const report=calculateRecoveryIntelligence(tenantId,release5Demo.rejections,release5Demo.recoveries,release5Demo.attempts,release5Demo.outcomes);expect(report.recovered).toBe(3);expect(report.revenue).toBe(166);expect(report.recoveryRate).toBe(100)})
  it('keeps contribution unavailable when incremental costs are unknown',()=>expect(calculateRecoveryIntelligence(tenantId,release5Demo.rejections,release5Demo.recoveries,release5Demo.attempts,release5Demo.outcomes).contribution).toBeNull())
  it('reports an empty tenant without fabricated ratios',()=>{const report=calculateRecoveryIntelligence('empty',release5Demo.rejections,release5Demo.recoveries,release5Demo.attempts,release5Demo.outcomes);expect(report.rejected).toBe(0);expect(report.recoveryRate).toBeNull();expect(report.revenue).toBeNull()})
  it('links attempts to trusted delivery attempt identifiers',()=>expect(release5Demo.attempts.every((row)=>row.deliveryAttemptId&&release5Demo.deliveryAttempts.some((attempt)=>attempt.id===row.deliveryAttemptId))).toBe(true))
  it('preserves an auditable journey event for every recovery',()=>expect(release5Demo.recoveries.every((row)=>release5Demo.events.some((event)=>event.leadRecoveryId===row.id))).toBe(true))
})
