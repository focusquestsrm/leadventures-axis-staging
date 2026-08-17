-- Lead Ventures Axis Release 4: integrations and closed-loop outcomes.
-- Non-destructive extension of the applied R1-R3 schema.

alter table public.integrations
  add column category text not null default 'other' check(category in ('lead_distribution','crm','media','webhook','file_import','api','data_warehouse','other')),
  add column vendor text not null default 'Custom',
  add column last_sync_at timestamptz,
  add column last_success_at timestamptz,
  add column records_processed integer not null default 0 check(records_processed>=0),
  add column error_count integer not null default 0 check(error_count>=0),
  add column health text not null default 'not_configured' check(health in ('healthy','attention','not_configured'));

create table public.integration_field_mappings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_field text not null, axis_field text not null, required boolean not null default false,
  transform text not null default 'none', created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,integration_id,external_field),
  constraint integration_field_names_present check(length(trim(external_field))>0 and length(trim(axis_field))>0)
);

create table public.integration_import_batches (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade, file_name text not null,
  status text not null default 'draft' check(status in ('draft','validating','ready','processing','completed','completed_with_errors','failed','cancelled')),
  rows_received integer not null default 0, rows_valid integer not null default 0, rows_invalid integer not null default 0,
  rows_imported integer not null default 0, rows_duplicate integer not null default 0, rows_unmatched integer not null default 0,
  started_at timestamptz not null default now(), completed_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  constraint import_counts_nonnegative check(rows_received>=0 and rows_valid>=0 and rows_invalid>=0 and rows_imported>=0 and rows_duplicate>=0 and rows_unmatched>=0),
  constraint import_completion_order check(completed_at is null or completed_at>=started_at)
);

create table public.integration_import_errors (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  import_batch_id uuid not null references public.integration_import_batches(id) on delete cascade,
  row_number integer not null check(row_number>0), error_code text not null, safe_message text not null,
  resolution_status text not null default 'open' check(resolution_status in ('open','resolved','ignored')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  constraint import_error_safe_message_size check(length(safe_message)<=500)
);

create table public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  status text not null default 'running' check(status in ('running','completed','failed')),
  records_processed integer not null default 0, records_created integer not null default 0, records_updated integer not null default 0,
  records_skipped integer not null default 0, records_errored integer not null default 0, duration_ms integer,
  started_at timestamptz not null default now(), completed_at timestamptz, safe_error_code text,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  constraint sync_counts_nonnegative check(records_processed>=0 and records_created>=0 and records_updated>=0 and records_skipped>=0 and records_errored>=0),
  constraint sync_duration_nonnegative check(duration_ms is null or duration_ms>=0)
);

create table public.outcome_mappings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_value text not null, outcome_type text not null check(outcome_type in ('contacted','qualified','appointment','application','enrollment','sale','start','completed','cancelled','lost','other')),
  outcome_stage text not null, active boolean not null default true, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,integration_id,external_value)
);

create table public.lead_outcomes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade, integration_id uuid not null references public.integrations(id) on delete restrict,
  import_batch_id uuid references public.integration_import_batches(id) on delete set null, external_outcome_id text not null,
  outcome_type text not null check(outcome_type in ('contacted','qualified','appointment','application','enrollment','sale','start','completed','cancelled','lost','other')),
  outcome_stage text not null, status text not null default 'completed', occurred_at timestamptz not null,
  monetary_value numeric(14,2), currency text not null default 'USD', program_id uuid references public.programs(id) on delete set null,
  buyer_id uuid references public.buyers(id) on delete set null, metadata jsonb not null default '{}', source_system text not null,
  external_record_id text not null, ingested_at timestamptz not null default now(), created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,integration_id,external_outcome_id),
  constraint outcome_value_nonnegative check(monetary_value is null or monetary_value>=0),
  constraint outcome_metadata_size check(pg_column_size(metadata)<=8192)
);

alter table public.lead_delivery_attempts
  add column integration_id uuid references public.integrations(id) on delete set null,
  add column import_batch_id uuid references public.integration_import_batches(id) on delete set null,
  add column source_system text,
  add column ingested_at timestamptz;

create unique index delivery_attempt_external_idempotency_idx on public.lead_delivery_attempts(tenant_id,integration_id,external_reference) where integration_id is not null and external_reference is not null;
create index integration_field_mappings_tenant_idx on public.integration_field_mappings(tenant_id,integration_id);
create index integration_import_batches_tenant_time_idx on public.integration_import_batches(tenant_id,integration_id,created_at desc);
create index integration_import_errors_batch_idx on public.integration_import_errors(tenant_id,import_batch_id,row_number);
create index integration_sync_runs_tenant_time_idx on public.integration_sync_runs(tenant_id,integration_id,started_at desc);
create index lead_outcomes_tenant_time_idx on public.lead_outcomes(tenant_id,occurred_at desc);
create index lead_outcomes_tenant_lead_idx on public.lead_outcomes(tenant_id,lead_id,occurred_at);
create index lead_outcomes_tenant_dimensions_idx on public.lead_outcomes(tenant_id,buyer_id,program_id,outcome_type);

do $$ declare table_name text; begin
  foreach table_name in array array['integration_field_mappings','outcome_mappings','lead_outcomes'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.axis_set_updated_at()',table_name);
  end loop;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['integration_field_mappings','integration_import_batches','integration_import_errors','integration_sync_runs','outcome_mappings','lead_outcomes'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]) and (created_by is null or created_by=auth.uid()))',table_name,table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
  end loop;
end $$;

grant select,insert,update,delete on public.integration_field_mappings,public.integration_import_batches,public.integration_import_errors,public.integration_sync_runs,public.outcome_mappings,public.lead_outcomes to authenticated;

create or replace function public.axis_enforce_r4_tenant_fk()
returns trigger language plpgsql set search_path=public as $$
declare d jsonb:=to_jsonb(new); relation_id uuid;
begin
  relation_id:=nullif(d->>'integration_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.integrations where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id:=nullif(d->>'import_batch_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.integration_import_batches where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id:=nullif(d->>'lead_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.leads where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id:=nullif(d->>'buyer_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.buyers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id:=nullif(d->>'program_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.programs where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  return new;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['integration_field_mappings','integration_import_batches','integration_import_errors','integration_sync_runs','outcome_mappings','lead_outcomes','lead_delivery_attempts'] loop
    execute format('create trigger r4_%I_tenant_fk before insert or update on public.%I for each row execute function public.axis_enforce_r4_tenant_fk()',table_name,table_name);
  end loop;
  foreach table_name in array array['integration_field_mappings','integration_import_batches','integration_import_errors','integration_sync_runs','outcome_mappings','lead_outcomes'] loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.axis_capture_audit_event()',table_name,table_name);
  end loop;
end $$;

create or replace function public.axis_finalize_leadhoop_import(p_tenant_id uuid,p_integration_id uuid,p_file_name text,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_batch uuid; v_row jsonb; v_delivery uuid; v_attempt uuid; v_received integer:=0; v_valid integer:=0; v_invalid integer:=0; v_imported integer:=0; v_duplicate integer:=0; v_unmatched integer:=0; v_status text; v_issue jsonb;
begin
  if not public.axis_has_tenant_role(p_tenant_id,array['tenant_admin','manager']::public.axis_role[]) then raise insufficient_privilege using message='Integration import requires an authorized tenant operator'; end if;
  if not exists(select 1 from public.integrations where id=p_integration_id and tenant_id=p_tenant_id and category='lead_distribution') then raise exception 'Invalid tenant relationship'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'Import payload must contain at most 10000 normalized rows'; end if;
  insert into public.integration_import_batches(tenant_id,integration_id,file_name,status,rows_received,created_by) values(p_tenant_id,p_integration_id,left(p_file_name,255),'processing',jsonb_array_length(p_rows),auth.uid()) returning id into v_batch;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_received:=v_received+1;
    if v_row->>'match_status'='duplicate' or exists(select 1 from public.lead_delivery_attempts where tenant_id=p_tenant_id and integration_id=p_integration_id and external_reference=v_row->>'external_transaction_id') then v_duplicate:=v_duplicate+1; continue; end if;
    if nullif(v_row->>'lead_id','') is null or nullif(v_row->>'buyer_id','') is null or exists(select 1 from jsonb_array_elements(coalesce(v_row->'issues','[]'::jsonb)) issue where issue->>'severity'='error') then
      v_invalid:=v_invalid+1; if nullif(v_row->>'lead_id','') is null then v_unmatched:=v_unmatched+1; end if;
      for v_issue in select value from jsonb_array_elements(coalesce(v_row->'issues','[]'::jsonb)) loop
        insert into public.integration_import_errors(tenant_id,integration_id,import_batch_id,row_number,error_code,safe_message,created_by) values(p_tenant_id,p_integration_id,v_batch,coalesce((v_row->>'row_number')::integer,v_received+1),coalesce(v_issue->>'code','VALIDATION_ERROR'),'Normalized row failed validation; inspect the configured mapping.',auth.uid());
      end loop;
      continue;
    end if;
    v_valid:=v_valid+1; v_status:=v_row->>'status';
    select id into v_delivery from public.lead_deliveries where tenant_id=p_tenant_id and lead_id=(v_row->>'lead_id')::uuid order by created_at desc limit 1;
    if v_delivery is null then insert into public.lead_deliveries(tenant_id,lead_id,status,started_at,created_by) values(p_tenant_id,(v_row->>'lead_id')::uuid,'in_progress',coalesce((v_row->>'occurred_at')::timestamptz,now()),auth.uid()) returning id into v_delivery; end if;
    insert into public.lead_delivery_attempts(tenant_id,lead_delivery_id,lead_id,buyer_id,attempt_number,delivery_method,status,response_time_ms,external_reference,payout,created_by,integration_id,import_batch_id,source_system,ingested_at)
    select p_tenant_id,v_delivery,(v_row->>'lead_id')::uuid,(v_row->>'buyer_id')::uuid,coalesce(max(attempt_number),0)+1,'import',v_status,(v_row->>'response_time_ms')::integer,v_row->>'external_transaction_id',(v_row->>'payout')::numeric,auth.uid(),p_integration_id,v_batch,'LeadHoop',now() from public.lead_delivery_attempts where lead_delivery_id=v_delivery returning id into v_attempt;
    if v_status in ('rejected','timeout') then insert into public.lead_rejections(tenant_id,lead_id,delivery_attempt_id,buyer_id,rejection_category,reason,recoverable,created_by) values(p_tenant_id,(v_row->>'lead_id')::uuid,v_attempt,(v_row->>'buyer_id')::uuid,coalesce(nullif(lower(v_row->>'rejection_reason'),''),case when v_status='timeout' then 'timeout' else 'unknown' end),'Imported structured outcome',lower(coalesce(v_row->>'rejection_reason',v_status)) in ('cap','geography','timeout','buyer_error'),auth.uid()); end if;
    v_imported:=v_imported+1;
  end loop;
  update public.integration_import_batches set status=case when v_invalid+v_unmatched>0 then 'completed_with_errors' else 'completed' end,rows_received=v_received,rows_valid=v_valid,rows_invalid=v_invalid,rows_imported=v_imported,rows_duplicate=v_duplicate,rows_unmatched=v_unmatched,completed_at=now() where id=v_batch;
  update public.integrations set last_sync_at=now(),last_success_at=now(),records_processed=records_processed+v_received,error_count=error_count+v_invalid,health=case when v_invalid>0 then 'attention' else 'healthy' end where id=p_integration_id and tenant_id=p_tenant_id;
  return jsonb_build_object('batchId',v_batch,'status',case when v_invalid+v_unmatched>0 then 'completed_with_errors' else 'completed' end);
end $$;

revoke all on function public.axis_finalize_leadhoop_import(uuid,uuid,text,jsonb) from public;
grant execute on function public.axis_finalize_leadhoop_import(uuid,uuid,text,jsonb) to authenticated;

create or replace function public.axis_outcome_intelligence_snapshot(p_tenant_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_preset text default 'last_30_days',p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare v_start timestamptz; v_end timestamptz; v_previous_start timestamptz; v_previous_end timestamptz; v_duration interval; v_result jsonb;
begin
  if auth.uid() is null or not public.axis_is_tenant_member(p_tenant_id) then raise insufficient_privilege using message='Not authorized for tenant outcome intelligence'; end if;
  v_end:=coalesce(p_end,now());
  v_start:=case p_preset when 'today' then date_trunc('day',v_end) when 'yesterday' then date_trunc('day',v_end)-interval '1 day' when 'last_7_days' then date_trunc('day',v_end)-interval '6 days' when 'this_month' then date_trunc('month',v_end) when 'last_month' then date_trunc('month',v_end)-interval '1 month' when 'custom' then coalesce(p_start,date_trunc('day',v_end)-interval '29 days') else date_trunc('day',v_end)-interval '29 days' end;
  if p_preset='yesterday' then v_end:=date_trunc('day',v_end)-interval '1 microsecond'; end if; if p_preset='last_month' then v_end:=date_trunc('month',v_end)-interval '1 microsecond'; end if;
  v_duration:=greatest(v_end-v_start,interval '1 day'); v_previous_end:=v_start-interval '1 microsecond'; v_previous_start:=v_start-v_duration;
  with tenant_leads as (
    select l.* from public.leads l where l.tenant_id=p_tenant_id
      and (nullif(p_filters->>'traffic_source_id','') is null or l.traffic_source_id=nullif(p_filters->>'traffic_source_id','')::uuid)
      and (nullif(p_filters->>'campaign_id','') is null or l.campaign_id=nullif(p_filters->>'campaign_id','')::uuid)
      and (nullif(p_filters->>'program_id','') is null or l.program_id=nullif(p_filters->>'program_id','')::uuid)
      and (nullif(p_filters->>'offer_id','') is null or l.offer_id=nullif(p_filters->>'offer_id','')::uuid)
      and (nullif(p_filters->>'lead_status','') is null or l.current_status=p_filters->>'lead_status')
  ), current_leads as (select * from tenant_leads where received_at between v_start and v_end), previous_leads as (select * from tenant_leads where received_at between v_previous_start and v_previous_end),
  current_outcomes as (select o.* from public.lead_outcomes o join current_leads l on l.id=o.lead_id where o.tenant_id=p_tenant_id and o.occurred_at<=v_end and (nullif(p_filters->>'buyer_id','') is null or o.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)),
  previous_outcomes as (select o.* from public.lead_outcomes o join previous_leads l on l.id=o.lead_id where o.tenant_id=p_tenant_id and o.occurred_at<=v_previous_end and (nullif(p_filters->>'buyer_id','') is null or o.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)),
  summary as (select (select count(*) from current_leads where current_status in ('accepted','recovered'))::numeric accepted,(select count(*) from previous_leads where current_status in ('accepted','recovered'))::numeric previous_accepted,(select count(*) from current_leads)::numeric leads,(select count(*) from previous_leads)::numeric previous_leads)
  select jsonb_build_object(
    'outcomes',jsonb_build_object(
      'contacted',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type='contacted'),(select count(distinct lead_id) from previous_outcomes where outcome_type='contacted')),
      'qualified',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type='qualified'),(select count(distinct lead_id) from previous_outcomes where outcome_type='qualified')),
      'applicationsSales',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type in ('application','sale')),(select count(distinct lead_id) from previous_outcomes where outcome_type in ('application','sale'))),
      'conversions',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type in ('enrollment','sale')),(select count(distinct lead_id) from previous_outcomes where outcome_type in ('enrollment','sale'))),
      'startsCompletions',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type in ('start','completed')),(select count(distinct lead_id) from previous_outcomes where outcome_type in ('start','completed'))),
      'revenue',public.axis_intelligence_metric((select sum(monetary_value) from current_outcomes),(select sum(monetary_value) from previous_outcomes)),
      'revenuePerLead',public.axis_intelligence_metric(case when s.leads>0 then (select sum(monetary_value) from current_outcomes)/s.leads end,case when s.previous_leads>0 then (select sum(monetary_value) from previous_outcomes)/s.previous_leads end),
      'revenuePerAcceptedLead',public.axis_intelligence_metric(case when s.accepted>0 then (select sum(monetary_value) from current_outcomes)/s.accepted end,case when s.previous_accepted>0 then (select sum(monetary_value) from previous_outcomes)/s.previous_accepted end),
      'funnel',jsonb_build_array(
        jsonb_build_object('key','accepted','label','Accepted Leads','count',s.accepted,'conversion',case when s.leads>0 then s.accepted/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','contacted','label','Contacted','count',(select count(distinct lead_id) from current_outcomes where outcome_type='contacted'),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type='contacted')/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','qualified','label','Qualified Outcomes','count',(select count(distinct lead_id) from current_outcomes where outcome_type='qualified'),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type='qualified')/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','applications_sales','label','Applications / Sales','count',(select count(distinct lead_id) from current_outcomes where outcome_type in ('application','sale')),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type in ('application','sale'))/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','conversions','label','Conversions','count',(select count(distinct lead_id) from current_outcomes where outcome_type in ('enrollment','sale')),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type in ('enrollment','sale'))/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','starts_completions','label','Starts / Completions','count',(select count(distinct lead_id) from current_outcomes where outcome_type in ('start','completed')),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type in ('start','completed'))/s.leads*100 end,'dropoff',null)
      )
    ),
    'sources',coalesce((select jsonb_agg(jsonb_build_object('sourceId',coalesce(l.traffic_source_id::text,''),'campaignId',coalesce(l.campaign_id::text,''),'conversions',count(distinct o.lead_id) filter(where o.outcome_type in ('enrollment','sale')),'outcomeRevenue',sum(o.monetary_value))) from current_leads l left join current_outcomes o on o.lead_id=l.id group by l.traffic_source_id,l.campaign_id),'[]'::jsonb),
    'buyers',coalesce((select jsonb_agg(jsonb_build_object('buyerId',b.id,'qualifiedOutcomes',count(distinct o.lead_id) filter(where o.outcome_type='qualified'),'applicationsSales',count(distinct o.lead_id) filter(where o.outcome_type in ('application','sale')),'conversions',count(distinct o.lead_id) filter(where o.outcome_type in ('enrollment','sale')),'startsCompletions',count(distinct o.lead_id) filter(where o.outcome_type in ('start','completed')),'outcomeRevenue',sum(o.monetary_value),'revenuePerLead',case when count(distinct o.lead_id)>0 then sum(o.monetary_value)/count(distinct o.lead_id) end)) from public.buyers b left join current_outcomes o on o.buyer_id=b.id where b.tenant_id=p_tenant_id group by b.id),'[]'::jsonb),
    'programs',coalesce((select jsonb_agg(jsonb_build_object('programId',p.id,'conversions',count(distinct o.lead_id) filter(where o.outcome_type in ('enrollment','sale')),'outcomeRevenue',sum(o.monetary_value))) from public.programs p left join current_outcomes o on o.program_id=p.id where p.tenant_id=p_tenant_id group by p.id),'[]'::jsonb)
  ) into v_result from summary s;
  return v_result;
end $$;

revoke all on function public.axis_outcome_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) from public;
grant execute on function public.axis_outcome_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) to authenticated;

comment on function public.axis_finalize_leadhoop_import(uuid,uuid,text,jsonb) is 'Trusted normalized-row finalization. Payload excludes PII; duplicate transaction IDs are skipped.';
comment on function public.axis_outcome_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) is 'Tenant-authorized closed-loop aggregates without identity data.';
