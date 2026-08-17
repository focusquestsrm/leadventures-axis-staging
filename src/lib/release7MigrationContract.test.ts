import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'
const sql=readFileSync(new URL('../../supabase/migrations/202608160010_release_7_acquire.sql',import.meta.url),'utf8').toLowerCase()
describe('Release 7 database contract',()=>{
 it('creates the canonical acquisition entities',()=>{for(const table of ['media_accounts','media_campaigns','media_ad_groups','media_ads','media_creatives','media_daily_metrics','media_sync_runs','landing_pages','lead_acquisition_attributions','experiments','experiment_variants'])expect(sql).toContain(`create table public.${table}`)})
 it('enables RLS and tenant reads for every acquisition table',()=>{expect(sql).toContain('enable row level security');expect(sql).toContain('axis_is_tenant_member(tenant_id)')})
 it('enforces tenant relationships',()=>{expect(sql).toContain('axis_enforce_r7_tenant_fk');for(const relation of ['media_account_id','media_campaign_id','media_ad_group_id','creative_id','lead_id','experiment_id'])expect(sql).toContain(`relation_name='${relation}'`)})
 it('uses unique external and idempotency constraints',()=>{expect(sql).toContain('unique(tenant_id,platform,external_account_id)');expect(sql).toContain('unique(tenant_id,media_account_id,external_campaign_id)');expect(sql).toContain('unique(tenant_id,idempotency_key)')})
 it('provides indexed scorecard dimensions',()=>{for(const index of ['media_daily_metrics_campaign_date_idx','media_daily_metrics_creative_date_idx','media_accounts_tenant_platform_idx','acquisition_attribution_lead_idx'])expect(sql).toContain(index)})
 it('keeps the media import PII-free and size bounded',()=>{expect(sql).toContain('axis_finalize_media_import');expect(sql).toContain('jsonb_array_length(p_records)>1000');expect(sql).not.toMatch(/email|phone|first_name|last_name|access_token|refresh_token|client_secret/)})
 it('does not disable RLS or grant anonymous access',()=>{expect(sql).not.toContain('disable row level security');expect(sql).not.toContain('to anon');expect(sql).not.toContain('service_role')})
 it('does not automate media changes',()=>expect(sql).toContain('does not change media budgets'))
})
