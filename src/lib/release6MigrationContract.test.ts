import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'
const sql=readFileSync(new URL('../../supabase/migrations/202608160009_release_6_optimize.sql',import.meta.url),'utf8').toLowerCase()
describe('Release 6 database contract',()=>{
  it('creates all optimization entities',()=>{for(const table of ['optimization_settings','metric_snapshots','forecasts','forecast_results','optimization_anomalies','recommendations','recommendation_actions'])expect(sql).toContain(`create table public.${table}`)})
  it('enables RLS for every entity',()=>{expect(sql).toContain('enable row level security');for(const table of ['optimization_settings','metric_snapshots','forecasts','forecast_results','optimization_anomalies','recommendations','recommendation_actions'])expect(sql).toContain(`'${table}'`)})
  it('uses tenant membership for reads',()=>expect(sql).toContain('axis_is_tenant_member(tenant_id)'))
  it('limits management writes to tenant admins and managers',()=>expect(sql).toContain("array[''tenant_admin'',''manager'']"))
  it('permits media buyers to record implementation only through the decision model',()=>expect(sql).toContain("array['tenant_admin','manager','media_buyer']"))
  it('makes recommendation actions append-only',()=>expect(sql).not.toMatch(/grant (update|delete)[^;]*recommendation_actions/))
  it('enforces cross-tenant relationships',()=>{expect(sql).toContain('axis_enforce_r6_tenant_fk');expect(sql).toContain("d->>'recommendation_id'");expect(sql).toContain("d->>'related_buyer_id'")})
  it('adds queue, dimension, and forecast indexes',()=>{for(const index of ['recommendations_queue_idx','recommendations_buyer_idx','recommendations_program_idx','recommendations_campaign_idx','optimization_forecasts_tenant_metric_idx'])expect(sql).toContain(index)})
  it('protects snapshot, forecast, and recommendation idempotency',()=>{expect(sql).toContain('metric_snapshots_idempotency_idx');expect(sql).toContain("coalesce(dimension_id,'00000000-0000-0000-0000-000000000000'::uuid)");expect(sql).toContain('unique(tenant_id,idempotency_key)');expect(sql).toContain('model_version,generated_for')})
  it('keeps decisions security invoker and human-controlled',()=>{expect(sql).toContain('axis_decide_recommendation');expect(sql).toContain('security invoker');expect(sql).toContain('never changes media, budgets, delivery, or recovery autonomously')})
  it('bounds PII-safe evidence and notes',()=>{expect(sql).toContain('recommendation_safe_json');expect(sql).toContain('length(notes)<=500')})
  it('never grants anonymous or service-role access',()=>{expect(sql).not.toContain('to anon');expect(sql).not.toContain('service_role')})
})
