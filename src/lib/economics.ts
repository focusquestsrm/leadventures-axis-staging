import type { ConfidenceLevel,DataFreshness } from '../types'

export interface EconomicInputs { leads:number;accepted:number;qualified:number;applicationsSales:number;conversions:number;startsCompletions:number;spend:number|null;revenue:number|null;recoveryRevenue:number|null;deliveryCost:number|null }
export interface EconomicMetrics { costPerLead:number|null;costPerAcceptedLead:number|null;costPerQualifiedOutcome:number|null;costPerApplicationSale:number|null;costPerConversion:number|null;costPerStartCompletion:number|null;revenuePerLead:number|null;revenuePerAcceptedLead:number|null;revenuePerOutcome:number|null;grossContribution:number|null;contributionPerLead:number|null;contributionPerAcceptedLead:number|null;recoveryRevenue:number|null;recoveryContribution:number|null;buyerYield:number|null;campaignYield:number|null;programYield:number|null }
const divide=(value:number|null,count:number)=>value==null||count<=0?null:value/count
const round=(value:number|null)=>value==null?null:Number(value.toFixed(2))

export function calculateEconomics(input:EconomicInputs):EconomicMetrics{
  const contribution=input.revenue!=null&&input.spend!=null&&input.deliveryCost!=null?input.revenue-input.spend-input.deliveryCost:null
  const recoveryContribution=input.recoveryRevenue!=null&&input.deliveryCost!=null?input.recoveryRevenue-input.deliveryCost:null
  const outcomeCount=input.conversions||input.applicationsSales||input.qualified
  return {costPerLead:round(divide(input.spend,input.leads)),costPerAcceptedLead:round(divide(input.spend,input.accepted)),costPerQualifiedOutcome:round(divide(input.spend,input.qualified)),costPerApplicationSale:round(divide(input.spend,input.applicationsSales)),costPerConversion:round(divide(input.spend,input.conversions)),costPerStartCompletion:round(divide(input.spend,input.startsCompletions)),revenuePerLead:round(divide(input.revenue,input.leads)),revenuePerAcceptedLead:round(divide(input.revenue,input.accepted)),revenuePerOutcome:round(divide(input.revenue,outcomeCount)),grossContribution:round(contribution),contributionPerLead:round(divide(contribution,input.leads)),contributionPerAcceptedLead:round(divide(contribution,input.accepted)),recoveryRevenue:input.recoveryRevenue,recoveryContribution:round(recoveryContribution),buyerYield:round(divide(input.revenue,input.accepted)),campaignYield:round(divide(contribution,input.leads)),programYield:round(divide(input.revenue,input.leads))}
}

export function confidenceFor(sampleSize:number,minimum=30,high=100,freshness:DataFreshness='fresh'):ConfidenceLevel{
  const base:ConfidenceLevel=sampleSize>=high?'high':sampleSize>=minimum?'medium':'low'
  if(freshness==='stale'||freshness==='unknown')return 'low'
  if(freshness==='delayed'&&base==='high')return 'medium'
  return base
}

export interface ExpectedValueInput { accepted:number;acceptanceSample:number;converted:number;conversionSample:number;revenue:number|null;revenueSample:number;acquisitionCost:number|null;incrementalCost:number|null;minimumSampleSize:number;freshness?:DataFreshness }
export function expectedLeadValue(input:ExpectedValueInput){
  const sampleSize=Math.min(input.acceptanceSample,input.conversionSample,input.revenueSample)
  const confidence=confidenceFor(sampleSize,input.minimumSampleSize,input.minimumSampleSize*3,input.freshness)
  if(sampleSize<input.minimumSampleSize||input.revenue==null||input.acquisitionCost==null||input.incrementalCost==null)return {value:null,acceptanceProbability:null,conversionProbability:null,expectedRevenue:null,sampleSize,confidence}
  const acceptanceProbability=input.acceptanceSample?input.accepted/input.acceptanceSample:0;const conversionProbability=input.conversionSample?input.converted/input.conversionSample:0;const expectedRevenue=input.revenueSample?input.revenue/input.revenueSample:0
  return {value:round(acceptanceProbability*conversionProbability*expectedRevenue-input.acquisitionCost-input.incrementalCost),acceptanceProbability,conversionProbability,expectedRevenue:round(expectedRevenue),sampleSize,confidence}
}
