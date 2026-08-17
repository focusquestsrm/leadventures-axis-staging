import type { IntegrationFieldMapping,MediaPlatform } from '../../types'

export interface ExternalMediaRow { [field:string]:string }
export interface CanonicalMediaMetricRecord { rowNumber:number;platform:MediaPlatform;externalAccountId:string;externalCampaignId:string;campaignName:string;externalAdGroupId:string;adGroupName:string;externalAdId:string;adName:string;externalCreativeId:string;creativeName:string;metricDate:string;currency:string;impressions:number;clicks:number;spend:number|null;platformConversions:number;reach:number|null;frequency:number|null }
export interface MediaImportIssue { code:string;message:string;severity:'error'|'warning' }
export interface MediaNormalizationResult { record:CanonicalMediaMetricRecord|null;issues:MediaImportIssue[] }
export interface MediaConnector { platform:MediaPlatform;vendor:string;nativeAdGroupLabel:string;normalize(rows:ExternalMediaRow[],mappings:IntegrationFieldMapping[]):MediaNormalizationResult[] }
