import { describe,expect,it } from 'vitest'
import { release7Demo } from '../data/release7Demo'
import { googleAdsAdapter } from '../integrations/media/googleAdsAdapter'
import { metaAdapter } from '../integrations/media/metaAdapter'
import { campaignSyncKey,mediaMetricIdempotencyKey } from '../integrations/media/mediaConnector'
import { tiktokAdapter } from '../integrations/media/tiktokAdapter'
import { previewMediaImport } from '../services/acquisitionService'
import type { ExperimentVariant,LeadAttribution,MediaDailyMetric } from '../types'
import { acquisitionPayloadHasPII,acquisitionRecommendations,aggregateAcquisition,capacityContext,detectCreativeFatigue,evaluateExperiment,resolveLastKnownTouch,scorecard } from './acquisition'

const tenantId='10000000-0000-4000-8000-000000000001'
const sample=(overrides:Partial<MediaDailyMetric>={}):MediaDailyMetric=>({id:'m',tenantId,mediaAccountId:'a',mediaCampaignId:'c',mediaAdGroupId:'g',mediaAdId:'ad',mediaCreativeId:'cr',metricDate:'2026-08-16',impressions:1000,clicks:100,spend:200,platformConversions:20,reach:800,frequency:1.5,leads:10,validatedLeads:9,acceptedLeads:5,qualifiedOutcomes:4,applicationsSales:3,downstreamConversions:2,startsCompletions:1,rejectedLeads:5,recoverableLeads:4,recoveredLeads:1,recoveredRevenue:100,revenue:1000,deliveryCost:50,createdAt:'2026-08-16T00:00:00Z',updatedAt:'2026-08-16T00:00:00Z',...overrides})
const variant=(id:string,visitors:number,contribution:number):ExperimentVariant=>({id,tenantId,experimentId:'e',name:id,landingPageId:null,creativeId:null,visitors,leads:Math.round(visitors*.1),acceptedLeads:Math.round(visitors*.06),downstreamConversions:Math.round(visitors*.02),revenue:contribution*2,contribution,createdAt:'2026-08-01',updatedAt:'2026-08-16'})

describe('Release 7 acquisition economics',()=>{
 it('calculates CPL',()=>expect(aggregateAcquisition([sample()]).costPerLead).toBe(20))
 it('calculates cost per accepted lead',()=>expect(aggregateAcquisition([sample()]).costPerAcceptedLead).toBe(40))
 it('calculates revenue per lead',()=>expect(aggregateAcquisition([sample()]).revenuePerLead).toBe(100))
 it('calculates contribution and contribution per lead',()=>{const result=aggregateAcquisition([sample()]);expect(result.contribution).toBe(750);expect(result.contributionPerLead).toBe(75)})
 it('preserves missing spend',()=>{const result=aggregateAcquisition([sample({spend:null})]);expect(result.spend).toBeNull();expect(result.costPerLead).toBeNull();expect(result.contribution).toBeNull()})
 it('keeps platform conversions distinct from Axis downstream conversion',()=>{const result=aggregateAcquisition([sample({platformConversions:20,downstreamConversions:2})]);expect(result.platformConversions).toBe(20);expect(result.downstreamConversions).toBe(2)})
 it('calculates CTR, CPC, and CPM',()=>{const result=aggregateAcquisition([sample()]);expect(result.ctr).toBe(10);expect(result.cpc).toBe(2);expect(result.cpm).toBe(200)})
 it('calculates recovery-aware economics',()=>{const result=aggregateAcquisition([sample()]);expect(result.recoveryRate).toBe(25);expect(result.recoveredRevenue).toBe(100)})
})
describe('Release 7 scorecards and context',()=>{
 it('groups source scorecards',()=>expect(scorecard([sample(),sample({id:'m2'})],'account',new Map([['a',{name:'Meta',platform:'meta'}]]))[0].metrics.leads).toBe(20))
 it('groups campaign scorecards',()=>expect(scorecard([sample()],'campaign',new Map([['c',{name:'Campaign',platform:'meta'}]]))[0].name).toBe('Campaign'))
 it('groups ad-group scorecards',()=>expect(scorecard([sample()],'ad_group',new Map([['g',{name:'Ad Set',platform:'meta'}]]))[0].id).toBe('g'))
 it('groups creative scorecards',()=>expect(scorecard([sample()],'creative',new Map([['cr',{name:'Creative',platform:'meta'}]]))[0].metrics.contributionPerLead).toBe(75))
 it('surfaces constrained buyer capacity',()=>expect(capacityContext(release7Demo.campaigns[0],[{id:'cap',tenantId,buyerId:'b',programId:'p1',capType:'monthly',periodStart:'2026-08-01',periodEnd:'2026-08-20',limit:100,delivered:80,status:'active'}],new Date('2026-08-16')).constrained).toBe(true))
 it('does not invent capacity without a linked cap',()=>expect(capacityContext(release7Demo.campaigns[0],[],new Date('2026-08-16')).constrained).toBe(false))
})

describe('Release 7 fatigue and experiments',()=>{
 it('detects paired creative fatigue signals',()=>{const prior=[sample({metricDate:'2026-08-01',clicks:100,spend:100,frequency:1})],current=[sample({metricDate:'2026-08-08',clicks:60,spend:120,frequency:1.4})];expect(detectCreativeFatigue('cr',current,prior).status).toBe('fatiguing')})
 it('keeps stable creative healthy',()=>expect(detectCreativeFatigue('cr',[sample()],[sample({metricDate:'2026-08-01'})]).status).toBe('healthy'))
 it('refuses an experiment winner below minimum sample',()=>expect(evaluateExperiment([variant('a',20,100),variant('b',22,150)],100).winner).toBeNull())
 it('selects by contribution per visitor with adequate samples',()=>expect(evaluateExperiment([variant('a',1000,2000),variant('b',1000,4000)],100).winner).toBe('b'))
 it('reduces stale experiment confidence',()=>expect(evaluateExperiment([variant('a',1000,2000),variant('b',1000,4000)],100,'stale').rows[0].confidence).toBe('low'))
})

describe('Release 7 attribution and recommendations',()=>{
 const touch=(id:string,tenant:string,attributedAt:string):LeadAttribution=>({id,tenantId:tenant,leadId:'lead',mediaCampaignId:'c',mediaAdGroupId:'g',mediaAdId:'ad',landingPageId:null,utmSource:'meta',utmMedium:'paid',utmCampaign:'campaign',utmContent:'creative',utmTerm:'',clickId:'click',platformCampaignId:'pc',platformAdGroupId:'pg',platformAdId:'pa',attributionModel:'last_known_acquisition_touch',attributedAt,createdAt:attributedAt})
 it('uses the last known deterministic acquisition touch',()=>expect(resolveLastKnownTouch(tenantId,'lead',[touch('old',tenantId,'2026-08-01'),touch('new',tenantId,'2026-08-02')])?.id).toBe('new'))
 it('isolates attribution by tenant',()=>expect(resolveLastKnownTouch(tenantId,'lead',[touch('other','other','2026-08-03')])).toBeNull())
 it('creates campaign economics recommendations',()=>expect(acquisitionRecommendations(tenantId,[{id:'c',name:'Value',platform:'meta',metrics:aggregateAcquisition([sample()])}],[],'fresh','2026-08-16T00:00:00Z')[0].recommendationType).toBe('campaign'))
 it('creates creative fatigue recommendations without automation',()=>{const rows=acquisitionRecommendations(tenantId,[],[{creativeId:'cr',status:'fatiguing',ctrChange:-20,cpcChange:18,frequencyChange:22,explanation:'threshold'}],'fresh','2026-08-16T00:00:00Z');expect(rows[0].recommendationType).toBe('creative');expect(rows[0].summary).toContain('no budget')})
 it('accepts PII-free aggregate context',()=>expect(acquisitionPayloadHasPII({campaignId:'c',spend:10,clickId:'x'})).toBe(false))
 it('rejects identity-shaped acquisition payloads',()=>expect(acquisitionPayloadHasPII({email:'person@example.test'})).toBe(true))
})

describe('Release 7 media normalization and idempotency',()=>{
 const row={'Account ID':'a','Campaign ID':'c','Campaign name':'Campaign','Date':'2026-08-16','Impressions':'1,000','Link clicks':'100','Amount spent':'200','Results':'12'}
 it('normalizes Meta exports',()=>expect(metaAdapter.normalize([row],[])[0].record?.platform).toBe('meta'))
 it('normalizes Google Ads exports',()=>expect(googleAdsAdapter.normalize([row],[])[0].record?.platform).toBe('google_ads'))
 it('normalizes TikTok exports',()=>expect(tiktokAdapter.normalize([row],[])[0].record?.platform).toBe('tiktok'))
 it('rejects missing campaign identifiers',()=>expect(metaAdapter.normalize([{'Account ID':'a','Date':'2026-08-16'}],[])[0].record).toBeNull())
 it('creates stable daily metric idempotency keys',()=>{const record=metaAdapter.normalize([row],[])[0].record!;expect(mediaMetricIdempotencyKey(record)).toBe(mediaMetricIdempotencyKey(record))})
 it('scopes campaign sync keys by tenant',()=>expect(campaignSyncKey('a','meta','account','campaign')).not.toBe(campaignSyncKey('b','meta','account','campaign')))
 it('identifies repeated media preview rows',()=>{const csv='Account ID,Campaign ID,Campaign name,Date,Impressions,Link clicks,Amount spent\na,c,Campaign,2026-08-16,1000,100,200';const existing=[sample({mediaAccountId:'a',mediaCampaignId:'c',mediaAdGroupId:null,mediaAdId:null,metricDate:'2026-08-16'})];expect(previewMediaImport(csv,'meta',[],existing).duplicates).toBe(1)})
})
