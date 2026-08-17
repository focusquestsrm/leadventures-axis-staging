-- Lead Ventures Axis Release 6: deterministic optimization copilot.
-- Forward-only, tenant-scoped, approval-based, and free of lead identity data.

create table public.optimization_settings (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
  minimum_sample_size integer not null default 30 check(minimum_sample_size between 3 and 10000),high_confidence_sample_size integer not null default 100 check(high_confidence_sample_size>=minimum_sample_size),
  anomaly_sensitivity numeric(6,2) not null default 20 check(anomaly_sensitivity between 1 and 500),pacing_threshold numeric(6,2) not null default 15 check(pacing_threshold between 1 and 100),
  forecast_method text not null default 'weighted_moving_average' check(forecast_method in ('trailing_average','weighted_moving_average')),recommendation_expiration_days integer not null default 14 check(recommendation_expiration_days between 1 and 365),
  economic_currency text not null default 'USD' check(length(economic_currency)=3),created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(tenant_id)
);
create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,snapshot_date date not null,
  dimension_type text not null check(dimension_type in ('tenant','buyer','program','campaign','recovery')),dimension_id uuid,
  leads integer not null default 0 check(leads>=0),accepted integer not null default 0 check(accepted>=0),rejected integer not null default 0 check(rejected>=0),recoverable integer not null default 0 check(recoverable>=0),recovered integer not null default 0 check(recovered>=0),timeouts integer not null default 0 check(timeouts>=0),
  response_time_ms numeric(14,2),qualified integer not null default 0 check(qualified>=0),applications_sales integer not null default 0 check(applications_sales>=0),conversions integer not null default 0 check(conversions>=0),starts_completions integer not null default 0 check(starts_completions>=0),
  spend numeric(14,2),revenue numeric(14,2),recovery_revenue numeric(14,2),delivery_cost numeric(14,2),created_at timestamptz not null default now(),
  constraint metric_values_nonnegative check((response_time_ms is null or response_time_ms>=0) and (spend is null or spend>=0) and (revenue is null or revenue>=0) and (recovery_revenue is null or recovery_revenue>=0) and (delivery_cost is null or delivery_cost>=0)),
  unique(tenant_id,snapshot_date,dimension_type,dimension_id)
);
create table public.forecasts (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,metric_key text not null,dimension_type text not null default 'tenant',dimension_id uuid,
  horizon text not null check(horizon in ('end_of_day','next_7_days','cap_period_end','month_end')),method text not null,model_version text not null default 'deterministic-wma-v1',sample_size integer not null check(sample_size>=0),confidence text not null check(confidence in ('low','medium','high')),
  forecast_value numeric(18,4),generated_for date not null,generated_at timestamptz not null default now(),expires_at timestamptz,created_by uuid references public.profiles(id),
  constraint forecast_metric_present check(length(trim(metric_key))>0),unique(tenant_id,metric_key,dimension_type,dimension_id,horizon,model_version,generated_for)
);
create table public.forecast_results (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,forecast_id uuid not null references public.forecasts(id) on delete cascade,
  actual_value numeric(18,4) not null,error numeric(18,4) not null,absolute_error numeric(18,4) not null check(absolute_error>=0),percentage_error numeric(12,4),measured_at timestamptz not null default now(),created_by uuid references public.profiles(id),unique(tenant_id,forecast_id)
);
create table public.optimization_anomalies (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,metric_key text not null,dimension_type text not null default 'tenant',dimension_id uuid,
  status text not null default 'active' check(status in ('active','resolved','dismissed')),severity text not null check(severity in ('low','medium','high','critical')),current_value numeric(18,4) not null,baseline_value numeric(18,4) not null,change_percent numeric(12,4),threshold numeric(12,4) not null check(threshold>0),confidence text not null check(confidence in ('low','medium','high')),sample_size integer not null check(sample_size>=0),
  likely_driver text,safe_explanation text not null,detected_at timestamptz not null default now(),resolved_at timestamptz,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint anomaly_safe_text check(length(safe_explanation)<=1000 and (likely_driver is null or length(likely_driver)<=500)),unique(tenant_id,metric_key,dimension_type,dimension_id,detected_at)
);
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,recommendation_type text not null check(recommendation_type in ('pacing','buyer','campaign','program','recovery','capacity','integration','data_quality','economic')),
  title text not null,summary text not null,status text not null default 'new' check(status in ('new','reviewed','approved','rejected','implemented','expired','dismissed')),priority text not null check(priority in ('low','medium','high','critical')),confidence text not null check(confidence in ('low','medium','high')),sample_size integer not null default 0 check(sample_size>=0),
  evidence jsonb not null default '[]',estimated_impact jsonb not null default '{}',related_buyer_id uuid references public.buyers(id) on delete set null,related_program_id uuid references public.programs(id) on delete set null,related_campaign_id uuid references public.campaigns(id) on delete set null,related_lead_id uuid references public.leads(id) on delete set null,
  freshness text not null default 'unknown' check(freshness in ('fresh','delayed','stale','unknown')),freshness_warning text,generated_at timestamptz not null default now(),expires_at timestamptz,idempotency_key text not null,created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint recommendation_safe_text check(length(title)<=250 and length(summary)<=1500 and (freshness_warning is null or length(freshness_warning)<=500)),constraint recommendation_safe_json check(jsonb_typeof(evidence)='array' and jsonb_typeof(estimated_impact)='object' and pg_column_size(evidence)<=8192 and pg_column_size(estimated_impact)<=4096),unique(tenant_id,idempotency_key)
);
create table public.recommendation_actions (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  action_type text not null check(action_type in ('reviewed','approved','rejected','dismissed','implemented')),status text not null default 'recorded' check(status in ('recorded','completed')),acted_by uuid references public.profiles(id),acted_at timestamptz not null default now(),notes text not null default '',
  expected_impact jsonb not null default '{}',actual_impact jsonb,before_metrics jsonb not null default '{}',after_metrics jsonb,created_at timestamptz not null default now(),
  constraint recommendation_action_safe check(length(notes)<=500 and jsonb_typeof(expected_impact)='object' and jsonb_typeof(before_metrics)='object' and (actual_impact is null or jsonb_typeof(actual_impact)='object') and (after_metrics is null or jsonb_typeof(after_metrics)='object') and pg_column_size(expected_impact)<=4096 and pg_column_size(before_metrics)<=4096),unique(tenant_id,recommendation_id,action_type,acted_at)
);

create index optimization_snapshots_tenant_date_idx on public.metric_snapshots(tenant_id,snapshot_date desc,dimension_type);
create unique index metric_snapshots_idempotency_idx on public.metric_snapshots(tenant_id,snapshot_date,dimension_type,coalesce(dimension_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index optimization_forecasts_tenant_metric_idx on public.forecasts(tenant_id,metric_key,horizon,generated_at desc);
create index optimization_forecast_results_tenant_idx on public.forecast_results(tenant_id,forecast_id);
create index optimization_anomalies_queue_idx on public.optimization_anomalies(tenant_id,status,severity,detected_at desc);
create index recommendations_queue_idx on public.recommendations(tenant_id,status,priority,generated_at desc);
create index recommendations_buyer_idx on public.recommendations(tenant_id,related_buyer_id,status);
create index recommendations_program_idx on public.recommendations(tenant_id,related_program_id,status);
create index recommendations_campaign_idx on public.recommendations(tenant_id,related_campaign_id,status);
create index recommendation_actions_history_idx on public.recommendation_actions(tenant_id,recommendation_id,acted_at);

do $$ declare table_name text;begin
  foreach table_name in array array['optimization_settings','optimization_anomalies','recommendations'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.axis_set_updated_at()',table_name);end loop;
  foreach table_name in array array['optimization_settings','metric_snapshots','forecasts','forecast_results','optimization_anomalies','recommendations','recommendation_actions'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
  end loop;
  foreach table_name in array array['optimization_settings','metric_snapshots','forecasts','forecast_results','optimization_anomalies','recommendations'] loop
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
  end loop;
end $$;
create policy recommendation_actions_insert on public.recommendation_actions for insert to authenticated with check(public.axis_has_tenant_role(tenant_id,array['tenant_admin','manager','media_buyer']::public.axis_role[]));
grant select on public.optimization_settings,public.metric_snapshots,public.forecasts,public.forecast_results,public.optimization_anomalies,public.recommendations,public.recommendation_actions to authenticated;
grant insert,update,delete on public.optimization_settings,public.metric_snapshots,public.forecasts,public.forecast_results,public.optimization_anomalies,public.recommendations to authenticated;
grant insert on public.recommendation_actions to authenticated;

create or replace function public.axis_enforce_r6_tenant_fk() returns trigger language plpgsql set search_path=public as $$
declare d jsonb:=to_jsonb(new);relation_id uuid;
begin
  relation_id:=nullif(d->>'related_buyer_id','')::uuid;if relation_id is not null and not exists(select 1 from public.buyers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'related_program_id','')::uuid;if relation_id is not null and not exists(select 1 from public.programs where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'related_campaign_id','')::uuid;if relation_id is not null and not exists(select 1 from public.campaigns where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'related_lead_id','')::uuid;if relation_id is not null and not exists(select 1 from public.leads where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'recommendation_id','')::uuid;if relation_id is not null and not exists(select 1 from public.recommendations where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'forecast_id','')::uuid;if relation_id is not null and not exists(select 1 from public.forecasts where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  return new;
end $$;
do $$ declare table_name text;begin
  foreach table_name in array array['optimization_settings','metric_snapshots','forecasts','forecast_results','optimization_anomalies','recommendations','recommendation_actions'] loop
    execute format('create trigger r6_%I_tenant_fk before insert or update on public.%I for each row execute function public.axis_enforce_r6_tenant_fk()',table_name,table_name);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.axis_capture_audit_event()',table_name,table_name);
  end loop;
end $$;

create or replace function public.axis_decide_recommendation(p_tenant_id uuid,p_recommendation_id uuid,p_decision text,p_safe_notes text default '') returns jsonb language plpgsql security invoker set search_path=public as $$
declare recommendation_row public.recommendations%rowtype;allowed_roles public.axis_role[];action_status text;
begin
  if p_decision not in ('reviewed','approved','rejected','dismissed','implemented') or length(p_safe_notes)>500 then raise exception 'Invalid recommendation decision';end if;
  allowed_roles:=case when p_decision='implemented' then array['tenant_admin','manager','media_buyer']::public.axis_role[] else array['tenant_admin','manager']::public.axis_role[] end;
  if not public.axis_has_tenant_role(p_tenant_id,allowed_roles) then raise insufficient_privilege using message='Recommendation decision requires an authorized tenant operator';end if;
  select * into recommendation_row from public.recommendations where id=p_recommendation_id and tenant_id=p_tenant_id for update;if not found then raise exception 'Recommendation not found';end if;
  if recommendation_row.status=p_decision then return jsonb_build_object('id',recommendation_row.id,'status',recommendation_row.status,'idempotent',true);end if;
  if p_decision='implemented' and recommendation_row.status<>'approved' then raise exception 'Recommendation must be approved before implementation';end if;
  if recommendation_row.status in ('rejected','dismissed','implemented','expired') then raise exception 'Recommendation is already terminal';end if;
  action_status:=case when p_decision='implemented' then 'completed' else 'recorded' end;
  update public.recommendations set status=p_decision where id=p_recommendation_id;
  insert into public.recommendation_actions(tenant_id,recommendation_id,action_type,status,acted_by,notes,expected_impact,before_metrics) values(p_tenant_id,p_recommendation_id,p_decision,action_status,auth.uid(),p_safe_notes,recommendation_row.estimated_impact,'{}');
  return jsonb_build_object('id',p_recommendation_id,'status',p_decision,'idempotent',false);
end $$;
revoke all on function public.axis_decide_recommendation(uuid,uuid,text,text) from public;grant execute on function public.axis_decide_recommendation(uuid,uuid,text,text) to authenticated;

comment on table public.metric_snapshots is 'PII-free aggregate optimization measurements; never stores lead identity or raw payloads.';
comment on table public.recommendation_actions is 'Append-only operator decisions and learning-loop measurements.';
comment on function public.axis_decide_recommendation(uuid,uuid,text,text) is 'Records a human recommendation decision; never changes media, budgets, delivery, or recovery autonomously.';
