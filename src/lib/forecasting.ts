import type { BuyerCap,ConfidenceLevel,Forecast } from '../types'
import { confidenceFor } from './economics'

const DAY=86_400_000
const round=(value:number,digits=1)=>Number(value.toFixed(digits))
export type PacingStatus='under_pace'|'on_pace'|'over_pace'|'projected_early_cap'|'at_cap'|'inactive'
export interface PacingResult { cap:number;delivered:number;remaining:number;elapsedDays:number;remainingDays:number;currentDailyPace:number;requiredDailyPace:number;projectedPeriodEnd:number;projectedCapDate:string|null;status:PacingStatus }

export function calculatePacing(cap:BuyerCap,recentDelivered:number,recentDays:number,now=new Date()):PacingResult{
  const start=new Date(cap.periodStart);const end=new Date(cap.periodEnd);const elapsed=Math.max(0,(now.getTime()-start.getTime())/DAY);const remainingDays=Math.max(0,(end.getTime()-now.getTime())/DAY);const remaining=Math.max(0,cap.limit-cap.delivered);const current=recentDays>0?recentDelivered/recentDays:0;const required=remainingDays>0?remaining/remainingDays:remaining>0?Number.POSITIVE_INFINITY:0;const projected=cap.delivered+current*remainingDays;const exhaustion=current>0&&remaining>0?new Date(now.getTime()+remaining/current*DAY).toISOString():null
  const status:PacingStatus=cap.status!=='active'?'inactive':cap.delivered>=cap.limit?'at_cap':projected>=cap.limit&&exhaustion&&new Date(exhaustion)<end?'projected_early_cap':required===0?'on_pace':current>required*1.15?'over_pace':current<required*.85?'under_pace':'on_pace'
  return {cap:cap.limit,delivered:cap.delivered,remaining,elapsedDays:round(elapsed),remainingDays:round(remainingDays),currentDailyPace:round(current),requiredDailyPace:Number.isFinite(required)?round(required):required,projectedPeriodEnd:round(projected),projectedCapDate:exhaustion,status}
}

export interface ForecastCalculation { value:number|null;sampleSize:number;confidence:ConfidenceLevel;method:string }
export function weightedMovingAverage(values:number[],minimumSampleSize=3):ForecastCalculation{
  if(values.length<minimumSampleSize)return {value:null,sampleSize:values.length,confidence:'low',method:'weighted_moving_average'}
  const weights=values.map((_,index)=>index+1);const total=weights.reduce((a,b)=>a+b,0);const value=values.reduce((sum,row,index)=>sum+row*weights[index],0)/total
  return {value:round(value),sampleSize:values.length,confidence:confidenceFor(values.length,minimumSampleSize,minimumSampleSize*3),method:'weighted_moving_average'}
}
export function projectForecast(values:number[],days:number,minimumSampleSize=3):ForecastCalculation{const daily=weightedMovingAverage(values,minimumSampleSize);return {...daily,value:daily.value==null?null:round(daily.value*days)}}
export function measureForecast(forecast:Pick<Forecast,'forecastValue'>,actual:number){const error=forecast.forecastValue==null?0:actual-forecast.forecastValue;return {actualValue:actual,error:round(error),absoluteError:round(Math.abs(error)),percentageError:forecast.forecastValue?round(Math.abs(error)/Math.abs(forecast.forecastValue)*100):null}}
