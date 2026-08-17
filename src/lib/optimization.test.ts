import { describe,expect,it } from 'vitest'
import type { BuyerCap,Forecast } from '../types'
import { calculateEconomics,confidenceFor,expectedLeadValue } from './economics'
import { calculatePacing,measureForecast,projectForecast,weightedMovingAverage } from './forecasting'
import { detectAnomaly,DeterministicRecommendationProvider,isExpired,sanitizedContextHasPII,type SanitizedOptimizationContext } from './recommendationRules'

const cap:BuyerCap={id:'cap',tenantId:'tenant-a',buyerId:'buyer-a',programId:'program-a',capType:'monthly',periodStart:'2026-08-01T00:00:00Z',periodEnd:'2026-09-01T00:00:00Z',limit:310,delivered:160,status:'active'}
const context:SanitizedOptimizationContext={tenantId:'tenant-a',generatedAt:'2026-08-16T12:00:00Z',freshness:'fresh',metrics:{sampleSize:120,revenuePerLead:42},pacing:[{buyerId:'buyer-a',programId:'program-a',status:'projected_early_cap',remaining:150,currentPace:20,requiredPace:10}],anomalies:[]}

describe('Release 6 pacing and forecasting',()=>{
  it('calculates required daily pace',()=>expect(calculatePacing(cap,70,7,new Date('2026-08-16T00:00:00Z')).requiredDailyPace).toBe(9.4))
  it('calculates current daily pace',()=>expect(calculatePacing(cap,70,7,new Date('2026-08-16T00:00:00Z')).currentDailyPace).toBe(10))
  it('projects cap exhaustion date',()=>expect(calculatePacing(cap,140,7,new Date('2026-08-16T00:00:00Z')).projectedCapDate).toContain('2026-08-23'))
  it('handles an ended period with remaining capacity',()=>expect(Number.isFinite(calculatePacing(cap,0,0,new Date('2026-09-02T00:00:00Z')).requiredDailyPace)).toBe(false))
  it('handles inactive buyers',()=>expect(calculatePacing({...cap,status:'paused'},10,2).status).toBe('inactive'))
  it('handles over-cap data without negative remaining',()=>expect(calculatePacing({...cap,delivered:400},10,2).remaining).toBe(0))
  it('calculates a transparent weighted forecast',()=>expect(weightedMovingAverage([10,20,30],3).value).toBe(23.3))
  it('projects a seven-day forecast from the rounded daily rate',()=>expect(projectForecast([10,20,30],7,3).value).toBe(163.1))
  it('returns unavailable for insufficient forecast history',()=>expect(projectForecast([10,20],7,3).value).toBeNull())
  it('tracks actual-versus-predicted quality',()=>expect(measureForecast({forecastValue:100} as Forecast,80)).toEqual({actualValue:80,error:-20,absoluteError:20,percentageError:20}))
})

describe('Release 6 economics and expected value',()=>{
  const input={leads:100,accepted:50,qualified:20,applicationsSales:10,conversions:5,startsCompletions:3,spend:2000,revenue:5000,recoveryRevenue:400,deliveryCost:200}
  it('calculates economic metrics only from supplied values',()=>{const result=calculateEconomics(input);expect(result.costPerLead).toBe(20);expect(result.grossContribution).toBe(2800);expect(result.contributionPerLead).toBe(28)})
  it('keeps missing cost and revenue metrics unavailable',()=>{const result=calculateEconomics({...input,spend:null,revenue:null});expect(result.costPerLead).toBeNull();expect(result.grossContribution).toBeNull();expect(result.revenuePerLead).toBeNull()})
  it('calculates deterministic expected lead value',()=>expect(expectedLeadValue({accepted:60,acceptanceSample:100,converted:12,conversionSample:60,revenue:12000,revenueSample:12,acquisitionCost:20,incrementalCost:2,minimumSampleSize:10}).value).toBe(98))
  it('does not expose unstable expected value',()=>expect(expectedLeadValue({accepted:5,acceptanceSample:9,converted:1,conversionSample:5,revenue:500,revenueSample:1,acquisitionCost:20,incrementalCost:2,minimumSampleSize:10}).value).toBeNull())
  it('labels low sample confidence',()=>expect(confidenceFor(19,30,100)).toBe('low'))
  it('reduces confidence for stale data',()=>expect(confidenceFor(200,30,100,'stale')).toBe('low'))
})

describe('Release 6 anomaly and recommendation rules',()=>{
  it('detects a material acceptance decline',()=>expect(detectAnomaly({tenantId:'tenant-a',metricKey:'acceptance_rate',current:50,baseline:70,sampleSize:100,thresholdPercent:20,direction:'decrease'})).not.toBeNull())
  it('detects a response-time increase',()=>expect(detectAnomaly({tenantId:'tenant-a',metricKey:'response_time',current:1800,baseline:620,sampleSize:100,thresholdPercent:20,direction:'increase'})?.severity).toBe('high'))
  it('ignores ordinary fluctuation below threshold',()=>expect(detectAnomaly({tenantId:'tenant-a',metricKey:'volume',current:105,baseline:100,sampleSize:100,thresholdPercent:20})).toBeNull())
  it('generates an explainable pacing recommendation',()=>{const rows=new DeterministicRecommendationProvider().generate(context);expect(rows[0].recommendationType).toBe('capacity');expect(rows[0].evidence.length).toBeGreaterThan(1)})
  it('isolates recommendations to context tenant',()=>expect(new DeterministicRecommendationProvider().generate(context).every((row)=>row.tenantId==='tenant-a')).toBe(true))
  it('marks recommendation expiration',()=>{const row=new DeterministicRecommendationProvider().generate(context)[0];expect(isExpired(row,new Date('2026-09-01T00:00:00Z'))).toBe(true)})
  it('reduces stale recommendation confidence',()=>expect(new DeterministicRecommendationProvider().generate({...context,freshness:'stale'})[0].confidence).toBe('medium'))
  it('keeps sanitized context free of PII keys',()=>expect(sanitizedContextHasPII(context)).toBe(false))
  it('detects forbidden identity keys in future AI context',()=>expect(sanitizedContextHasPII({...context,metrics:{email:1}})).toBe(true))
  it('handles an empty tenant without recommendations',()=>expect(new DeterministicRecommendationProvider().generate({...context,pacing:[],anomalies:[]}).length).toBe(0))
})
