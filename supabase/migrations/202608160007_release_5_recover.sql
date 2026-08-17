-- Lead Ventures Axis Release 5: controlled, explainable lead recovery.
-- Forward-only staging migration. No outbound delivery is executed by this migration.

create table public.recovery_policies (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, status text not null default 'active' check(status in ('active','paused')), priority integer not null default 100 check(priority>0),
  rejection_category text not null, program_id uuid references public.programs(id) on delete set null, offer_id uuid references public.offers(id) on delete set null,
  source_buyer_id uuid references public.buyers(id) on delete set null, max_attempts integer not null default 3 check(max_attempts between 1 and 20),
  max_attempts_per_buyer integer not null default 1 check(max_attempts_per_buyer between 1 and 5), max_destinations integer not null default 3 check(max_destinations between 1 and 20),
  max_lead_age_minutes integer not null default 60 check(max_lead_age_minutes between 1 and 10080), require_consent_confirmation boolean not null default true,
  allow_secondary_host_post boolean not null default false, allow_link_out boolean not null default false,
  execution_mode text not null default 'approval_required' check(execution_mode in ('advisory','approval_required','automatic')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,name), constraint recovery_policy_category_present check(length(trim(rejection_category))>0)
);

create table public.recovery_paths (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  recovery_policy_id uuid not null references public.recovery_policies(id) on delete cascade, buyer_id uuid references public.buyers(id) on delete restrict,
  offer_id uuid references public.offers(id) on delete set null, program_id uuid references public.programs(id) on delete set null,
  path_type text not null check(path_type in ('host_post','secondary_buyer','link_out','offer_wall','manual_review')),
  priority integer not null default 100 check(priority>0), status text not null default 'active' check(status in ('active','paused')),
  payout_override numeric(12,2), destination_reference text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,recovery_policy_id,priority), constraint recovery_path_value_nonnegative check(payout_override is null or payout_override>=0),
  constraint recovery_destination_reference_safe check(destination_reference is null or (length(destination_reference)<=255 and position('?' in destination_reference)=0)),
  constraint recovery_path_destination_shape check((path_type in ('host_post','secondary_buyer') and buyer_id is not null) or path_type in ('link_out','offer_wall','manual_review'))
);

create table public.lead_recoveries (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade, originating_rejection_id uuid not null references public.lead_rejections(id) on delete restrict,
  recovery_policy_id uuid not null references public.recovery_policies(id) on delete restrict,
  status text not null default 'eligible' check(status in ('eligible','queued','in_progress','recovered','exhausted','blocked','manual_review','cancelled')),
  execution_mode text not null default 'approval_required' check(execution_mode in ('advisory','approval_required','automatic')),
  consent_status text not null default 'missing' check(consent_status in ('confirmed','missing','not_required','blocked')), consent_scope text not null default '', consent_version text not null default '',
  secondary_delivery_allowed boolean not null default false, consent_confirmed_at timestamptz, eligibility_code text not null, explanation jsonb not null default '[]',
  recommended_path_id uuid references public.recovery_paths(id) on delete set null, idempotency_key text not null,
  started_at timestamptz, completed_at timestamptz, recovery_value numeric(12,2), incremental_cost numeric(12,2), currency text not null default 'USD',
  created_by uuid references public.profiles(id), approved_by uuid references public.profiles(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,idempotency_key), constraint recovery_values_nonnegative check((recovery_value is null or recovery_value>=0) and (incremental_cost is null or incremental_cost>=0)),
  constraint recovery_time_order check(completed_at is null or started_at is null or completed_at>=started_at),
  constraint recovery_explanation_safe check(jsonb_typeof(explanation)='array' and pg_column_size(explanation)<=4096),
  constraint recovery_consent_consistent check(not secondary_delivery_allowed or consent_status in ('confirmed','not_required'))
);
create unique index lead_recoveries_one_active_recovery_per_rejection_idx on public.lead_recoveries(tenant_id,originating_rejection_id) where status in ('eligible','queued','in_progress','manual_review');

create table public.recovery_attempts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_recovery_id uuid not null references public.lead_recoveries(id) on delete cascade, lead_id uuid not null references public.leads(id) on delete cascade,
  buyer_id uuid references public.buyers(id) on delete restrict, offer_id uuid references public.offers(id) on delete set null, program_id uuid references public.programs(id) on delete set null,
  recovery_path_id uuid references public.recovery_paths(id) on delete set null, path_type text not null check(path_type in ('host_post','secondary_buyer','link_out','offer_wall','manual_review')),
  attempt_number integer not null check(attempt_number>0), status text not null default 'pending' check(status in ('pending','eligible','attempted','accepted','rejected','skipped','blocked','timeout','error')),
  delivery_attempt_id uuid references public.lead_delivery_attempts(id) on delete set null, transaction_key text not null,
  started_at timestamptz, completed_at timestamptz, reason text not null default '', explanation jsonb not null default '[]',
  estimated_value numeric(12,2), actual_value numeric(12,2), incremental_cost numeric(12,2), created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  unique(tenant_id,transaction_key), unique(lead_recovery_id,attempt_number),
  constraint recovery_attempt_values_nonnegative check((estimated_value is null or estimated_value>=0) and (actual_value is null or actual_value>=0) and (incremental_cost is null or incremental_cost>=0)),
  constraint recovery_attempt_time_order check(completed_at is null or started_at is null or completed_at>=started_at),
  constraint recovery_attempt_explanation_safe check(jsonb_typeof(explanation)='array' and pg_column_size(explanation)<=4096),
  constraint recovery_attempt_reason_safe check(length(reason)<=500)
);

create table public.recovery_reviews (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_recovery_id uuid not null references public.lead_recoveries(id) on delete cascade, lead_id uuid not null references public.leads(id) on delete cascade,
  reason_code text not null, safe_reason text not null, status text not null default 'open' check(status in ('open','approved','blocked','resolved')),
  selected_path_id uuid references public.recovery_paths(id) on delete set null, resolved_by uuid references public.profiles(id), resolved_at timestamptz,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  constraint recovery_review_safe_text check(length(safe_reason)<=500), unique(tenant_id,lead_recovery_id,status)
);

create table public.recovery_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_recovery_id uuid not null references public.lead_recoveries(id) on delete cascade, lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null, safe_detail text not null default '', safe_metadata jsonb not null default '{}', actor_id uuid references public.profiles(id), occurred_at timestamptz not null default now(),
  constraint recovery_event_safe_size check(length(safe_detail)<=500 and pg_column_size(safe_metadata)<=4096)
);

create index recovery_policies_tenant_status_idx on public.recovery_policies(tenant_id,status,rejection_category,priority);
create index recovery_paths_tenant_policy_idx on public.recovery_paths(tenant_id,recovery_policy_id,status,priority);
create index lead_recoveries_tenant_queue_idx on public.lead_recoveries(tenant_id,status,created_at desc);
create index lead_recoveries_tenant_lead_idx on public.lead_recoveries(tenant_id,lead_id,created_at desc);
create index recovery_attempts_tenant_recovery_idx on public.recovery_attempts(tenant_id,lead_recovery_id,attempt_number);
create index recovery_attempts_tenant_buyer_idx on public.recovery_attempts(tenant_id,buyer_id,status,created_at desc);
create index recovery_reviews_tenant_queue_idx on public.recovery_reviews(tenant_id,status,created_at desc);
create index recovery_events_tenant_lead_idx on public.recovery_events(tenant_id,lead_id,occurred_at);

do $$ declare table_name text; begin
  foreach table_name in array array['recovery_policies','recovery_paths','lead_recoveries'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.axis_set_updated_at()',table_name); end loop;
  foreach table_name in array array['recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews','recovery_events'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
  end loop;
  foreach table_name in array array['recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews'] loop
    execute format('create policy %I_update on public.%I for update to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
  end loop;
end $$;
grant select,insert on public.recovery_policies,public.recovery_paths,public.lead_recoveries,public.recovery_attempts,public.recovery_reviews,public.recovery_events to authenticated;
grant update,delete on public.recovery_policies,public.recovery_paths,public.lead_recoveries,public.recovery_attempts,public.recovery_reviews to authenticated;

create or replace function public.axis_enforce_r5_tenant_fk() returns trigger language plpgsql set search_path=public as $$
declare d jsonb:=to_jsonb(new); relation_id uuid;
begin
  relation_id:=nullif(d->>'recovery_policy_id','')::uuid;if relation_id is not null and not exists(select 1 from public.recovery_policies where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'recovery_path_id','')::uuid;if relation_id is not null and not exists(select 1 from public.recovery_paths where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'recommended_path_id','')::uuid;if relation_id is not null and not exists(select 1 from public.recovery_paths where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'selected_path_id','')::uuid;if relation_id is not null and not exists(select 1 from public.recovery_paths where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'lead_recovery_id','')::uuid;if relation_id is not null and not exists(select 1 from public.lead_recoveries where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'lead_id','')::uuid;if relation_id is not null and not exists(select 1 from public.leads where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'originating_rejection_id','')::uuid;if relation_id is not null and not exists(select 1 from public.lead_rejections where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'buyer_id','')::uuid;if relation_id is not null and not exists(select 1 from public.buyers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'source_buyer_id','')::uuid;if relation_id is not null and not exists(select 1 from public.buyers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'offer_id','')::uuid;if relation_id is not null and not exists(select 1 from public.offers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'program_id','')::uuid;if relation_id is not null and not exists(select 1 from public.programs where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  relation_id:=nullif(d->>'delivery_attempt_id','')::uuid;if relation_id is not null and not exists(select 1 from public.lead_delivery_attempts where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  return new;
end $$;
do $$ declare table_name text;begin
  foreach table_name in array array['recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews','recovery_events'] loop
    execute format('create trigger r5_%I_tenant_fk before insert or update on public.%I for each row execute function public.axis_enforce_r5_tenant_fk()',table_name,table_name);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.axis_capture_audit_event()',table_name,table_name);
  end loop;
end $$;

create or replace function public.axis_decide_recovery(p_tenant_id uuid,p_recovery_id uuid,p_decision text,p_path_id uuid default null,p_safe_reason text default '') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare recovery_row public.lead_recoveries%rowtype;next_status text;
begin
  if not public.axis_has_tenant_role(p_tenant_id,array['tenant_admin','manager']::public.axis_role[]) then raise insufficient_privilege using message='Recovery approval requires an authorized tenant operator';end if;
  if p_decision not in ('approve','block','resolve') or length(p_safe_reason)>500 then raise exception 'Invalid recovery decision';end if;
  select * into recovery_row from public.lead_recoveries where id=p_recovery_id and tenant_id=p_tenant_id for update;if not found then raise exception 'Recovery not found';end if;
  if p_decision='approve' and coalesce(p_path_id,recovery_row.recommended_path_id) is null then raise exception 'Approved recovery path is required';end if;
  if p_path_id is not null and not exists(select 1 from public.recovery_paths where id=p_path_id and tenant_id=p_tenant_id and recovery_policy_id=recovery_row.recovery_policy_id and status='active') then raise exception 'Invalid tenant relationship';end if;
  next_status:=case p_decision when 'approve' then 'queued' when 'block' then 'blocked' else recovery_row.status end;
  if p_decision='approve' and recovery_row.execution_mode='advisory' then raise exception 'Advisory recovery cannot be queued for execution';end if;
  if p_decision='approve' and exists(select 1 from public.recovery_policies p where p.id=recovery_row.recovery_policy_id and p.require_consent_confirmation) and (recovery_row.consent_status<>'confirmed' or not recovery_row.secondary_delivery_allowed) then raise exception 'Configured consent gate is not satisfied';end if;
  if recovery_row.status in ('recovered','exhausted','cancelled') then return jsonb_build_object('id',recovery_row.id,'status',recovery_row.status,'idempotent',true);end if;
  if (p_decision='approve' and recovery_row.status='queued') or (p_decision='block' and recovery_row.status='blocked') then return jsonb_build_object('id',recovery_row.id,'status',recovery_row.status,'idempotent',true);end if;
  update public.lead_recoveries set status=next_status,recommended_path_id=coalesce(p_path_id,recommended_path_id),approved_by=case when p_decision='approve' then auth.uid() else approved_by end,approved_at=case when p_decision='approve' then now() else approved_at end,completed_at=case when p_decision='block' then now() else completed_at end where id=p_recovery_id;
  update public.recovery_reviews set status=case p_decision when 'approve' then 'approved' when 'block' then 'blocked' else 'resolved' end,selected_path_id=coalesce(p_path_id,selected_path_id),resolved_by=auth.uid(),resolved_at=now() where lead_recovery_id=p_recovery_id and tenant_id=p_tenant_id and status='open';
  insert into public.recovery_events(tenant_id,lead_recovery_id,lead_id,event_type,safe_detail,actor_id) values(p_tenant_id,p_recovery_id,recovery_row.lead_id,'recovery_'||p_decision,coalesce(nullif(p_safe_reason,''),'Authorized recovery decision recorded.'),auth.uid());
  return jsonb_build_object('id',p_recovery_id,'status',next_status,'idempotent',false);
end $$;
revoke all on function public.axis_decide_recovery(uuid,uuid,text,uuid,text) from public;grant execute on function public.axis_decide_recovery(uuid,uuid,text,uuid,text) to authenticated;

create or replace function public.axis_recovery_intelligence_snapshot(p_tenant_id uuid) returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.axis_is_tenant_member(p_tenant_id) then raise insufficient_privilege using message='Not authorized for tenant recovery intelligence';end if;
  with r as (select * from public.lead_recoveries where tenant_id=p_tenant_id),a as (select * from public.recovery_attempts where tenant_id=p_tenant_id),j as (select * from public.lead_rejections where tenant_id=p_tenant_id),converted as (select distinct o.lead_id from public.lead_outcomes o join r on r.lead_id=o.lead_id where o.tenant_id=p_tenant_id and o.outcome_type in ('enrollment','sale','completed'))
  select jsonb_build_object('rejected',(select count(*) from j),'recoverable',(select count(*) from r where status not in ('blocked','cancelled')),'attempts',(select count(*) from a),'recovered',(select count(*) from r where status='recovered'),'exhausted',(select count(*) from r where status='exhausted'),'blocked',(select count(*) from r where status='blocked'),'revenue',(select sum(recovery_value) from r where status='recovered'),'downstreamConversions',(select count(*) from converted)) into result;
  return result;
end $$;
revoke all on function public.axis_recovery_intelligence_snapshot(uuid) from public;grant execute on function public.axis_recovery_intelligence_snapshot(uuid) to authenticated;

comment on function public.axis_decide_recovery(uuid,uuid,text,uuid,text) is 'Records an authorized, PII-safe recovery decision. It does not perform outbound delivery.';
comment on table public.recovery_events is 'Operator-safe recovery history; identity and raw delivery payloads are prohibited.';
