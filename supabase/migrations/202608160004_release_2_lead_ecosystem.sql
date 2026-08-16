-- Lead Ventures Axis — Release 2 lead ecosystem (STAGING)
-- Forward-only, tenant-scoped, and free of lead identity data.

alter table public.buyers
  add column buyer_type text not null default 'education',
  add column delivery_method text not null default 'manual',
  add column default_payout numeric(12,2) not null default 0,
  add column currency text not null default 'USD',
  add column duplicate_window_days integer not null default 30,
  add column exclusive boolean not null default false,
  add column timezone text not null default 'UTC',
  add column operating_notes text;

alter table public.buyers
  add constraint buyers_default_payout_nonnegative check (default_payout >= 0),
  add constraint buyers_duplicate_window_nonnegative check (duplicate_window_days >= 0),
  add constraint buyers_currency_format check (currency ~ '^[A-Z]{3}$');

create table public.traffic_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  source_type text not null,
  external_id text,
  status public.record_status not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,name),
  constraint traffic_sources_type_present check (length(trim(source_type)) > 0)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  traffic_source_id uuid references public.traffic_sources(id) on delete set null,
  name text not null,
  external_id text,
  status public.record_status not null default 'active',
  campaign_type text,
  start_date date,
  end_date date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,name),
  constraint campaigns_date_order check (end_date is null or start_date is null or end_date >= start_date)
);

alter table public.leads
  add column traffic_source_id uuid references public.traffic_sources(id) on delete set null,
  add column campaign_id uuid references public.campaigns(id) on delete set null,
  add column current_status text not null default 'new',
  add column quality_score numeric(5,2),
  add column external_lead_id text,
  add column received_at timestamptz not null default now();

update public.leads
set current_status = case
  when status='qualified' then 'validated'
  when status='processing' then 'delivering'
  when status in ('new','validated','queued','delivering','accepted','rejected','recovered','closed') then status
  else 'new'
end,
quality_score = coalesce(lead_score,0),
received_at = created_at;

alter table public.leads
  add constraint leads_current_status_check check (current_status in ('new','validated','queued','delivering','accepted','rejected','recovered','closed')),
  add constraint leads_quality_score_check check (quality_score is null or quality_score between 0 and 100),
  add constraint leads_external_id_unique unique (tenant_id,external_lead_id);

create table public.buyer_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  status public.record_status not null default 'active',
  payout numeric(12,2),
  priority integer not null default 100,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,buyer_id,program_id),
  constraint buyer_programs_payout_nonnegative check (payout is null or payout >= 0),
  constraint buyer_programs_priority_positive check (priority > 0)
);

create table public.offer_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,offer_id,program_id)
);

insert into public.offer_programs(tenant_id,offer_id,program_id,created_by)
select tenant_id,id,program_id,created_by from public.offers where program_id is not null
on conflict (tenant_id,offer_id,program_id) do nothing;

create table public.buyer_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  rule_type text not null,
  operator text not null,
  value jsonb not null default '{}',
  status public.record_status not null default 'active',
  priority integer not null default 100,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_rules_priority_positive check (priority > 0)
);

create table public.buyer_caps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  cap_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  limit_value integer not null,
  delivered_value integer not null default 0,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_caps_period_order check (period_end > period_start),
  constraint buyer_caps_limit_positive check (limit_value > 0),
  constraint buyer_caps_delivered_nonnegative check (delivered_value >= 0),
  constraint buyer_caps_type_present check (length(trim(cap_type)) > 0)
);

create table public.lead_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','in_progress','accepted','exhausted','cancelled','error')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_deliveries_time_order check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.lead_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_delivery_id uuid not null references public.lead_deliveries(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  buyer_id uuid not null references public.buyers(id) on delete restrict,
  offer_id uuid references public.offers(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  attempt_number integer not null,
  delivery_method text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','timeout','error','cancelled')),
  request_started_at timestamptz,
  response_received_at timestamptz,
  response_time_ms integer,
  external_reference text,
  payout numeric(12,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_delivery_id,attempt_number),
  constraint delivery_attempt_number_positive check (attempt_number > 0),
  constraint delivery_response_time_nonnegative check (response_time_ms is null or response_time_ms >= 0),
  constraint delivery_payout_nonnegative check (payout is null or payout >= 0),
  constraint delivery_response_order check (response_received_at is null or request_started_at is null or response_received_at >= request_started_at)
);

create table public.lead_rejections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  delivery_attempt_id uuid not null unique references public.lead_delivery_attempts(id) on delete cascade,
  buyer_id uuid not null references public.buyers(id) on delete restrict,
  rejection_code text,
  rejection_category text not null,
  reason text,
  recoverable boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint lead_rejections_category_present check (length(trim(rejection_category)) > 0)
);

create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('new','validated','queued','delivering','accepted','rejected','recovered','closed')),
  reason text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index traffic_sources_tenant_status_idx on public.traffic_sources(tenant_id,status);
create index campaigns_tenant_source_idx on public.campaigns(tenant_id,traffic_source_id);
create index campaigns_tenant_status_idx on public.campaigns(tenant_id,status);
create index leads_tenant_campaign_idx on public.leads(tenant_id,campaign_id) where campaign_id is not null;
create index leads_tenant_current_status_idx on public.leads(tenant_id,current_status,created_at desc);
create index buyer_programs_tenant_buyer_idx on public.buyer_programs(tenant_id,buyer_id,status);
create index buyer_programs_tenant_program_idx on public.buyer_programs(tenant_id,program_id,status);
create index offer_programs_tenant_offer_idx on public.offer_programs(tenant_id,offer_id);
create index buyer_rules_tenant_buyer_idx on public.buyer_rules(tenant_id,buyer_id,status,priority);
create index buyer_caps_tenant_buyer_period_idx on public.buyer_caps(tenant_id,buyer_id,period_start,period_end);
create index buyer_caps_tenant_program_idx on public.buyer_caps(tenant_id,program_id) where program_id is not null;
create index lead_deliveries_tenant_lead_idx on public.lead_deliveries(tenant_id,lead_id,created_at desc);
create index delivery_attempts_tenant_lead_idx on public.lead_delivery_attempts(tenant_id,lead_id,attempt_number);
create index delivery_attempts_tenant_buyer_idx on public.lead_delivery_attempts(tenant_id,buyer_id,created_at desc);
create index delivery_attempts_tenant_status_idx on public.lead_delivery_attempts(tenant_id,status,created_at desc);
create index lead_rejections_tenant_lead_idx on public.lead_rejections(tenant_id,lead_id,created_at desc);
create index lead_rejections_tenant_category_idx on public.lead_rejections(tenant_id,rejection_category);
create index lead_status_history_tenant_lead_idx on public.lead_status_history(tenant_id,lead_id,created_at, id);

do $$ declare table_name text; begin
  foreach table_name in array array['traffic_sources','campaigns','buyer_programs','offer_programs','buyer_rules','buyer_caps','lead_deliveries','lead_delivery_attempts'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.axis_set_updated_at()',table_name);
  end loop;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['traffic_sources','campaigns','buyer_programs','offer_programs','buyer_rules','buyer_caps','lead_deliveries','lead_delivery_attempts','lead_rejections','lead_status_history'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
  end loop;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['traffic_sources','campaigns'] loop
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'',''media_buyer'']::public.axis_role[]) and (created_by is null or created_by=auth.uid()))',table_name,table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'',''media_buyer'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'',''media_buyer'']::public.axis_role[]))',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'',''media_buyer'']::public.axis_role[]))',table_name,table_name);
  end loop;
  foreach table_name in array array['buyer_programs','offer_programs','buyer_rules','buyer_caps','lead_deliveries','lead_delivery_attempts','lead_rejections'] loop
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]) and (created_by is null or created_by=auth.uid()))',table_name,table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]))',table_name,table_name);
  end loop;
end $$;

create policy lead_status_history_insert on public.lead_status_history for insert to authenticated
  with check(public.axis_has_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]) and (changed_by is null or changed_by=auth.uid()));

grant select on public.traffic_sources,public.campaigns,public.buyer_programs,public.offer_programs,public.buyer_rules,public.buyer_caps,public.lead_deliveries,public.lead_delivery_attempts,public.lead_rejections,public.lead_status_history to authenticated;
grant insert,update,delete on public.traffic_sources,public.campaigns,public.buyer_programs,public.offer_programs,public.buyer_rules,public.buyer_caps,public.lead_deliveries,public.lead_delivery_attempts,public.lead_rejections to authenticated;
grant insert on public.lead_status_history to authenticated;

-- Validate every foreign relation against the row's tenant. Ordinary UUID FKs do not prove tenant ownership.
create or replace function public.axis_enforce_r2_tenant_fk()
returns trigger language plpgsql set search_path=public as $$
declare d jsonb := to_jsonb(new); relation_id uuid;
begin
  relation_id := nullif(d->>'traffic_source_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.traffic_sources where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'campaign_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.campaigns where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'lead_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.leads where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'lead_delivery_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.lead_deliveries where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'delivery_attempt_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.lead_delivery_attempts where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'buyer_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.buyers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'program_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.programs where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  relation_id := nullif(d->>'offer_id','')::uuid;
  if relation_id is not null and not exists(select 1 from public.offers where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  return new;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['traffic_sources','campaigns','leads','buyer_programs','offer_programs','buyer_rules','buyer_caps','lead_deliveries','lead_delivery_attempts','lead_rejections','lead_status_history'] loop
    execute format('create trigger r2_%I_tenant_fk before insert or update on public.%I for each row execute function public.axis_enforce_r2_tenant_fk()',table_name,table_name);
  end loop;
end $$;

create or replace function public.axis_record_lead_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' or old.current_status is distinct from new.current_status then
    insert into public.lead_status_history(tenant_id,lead_id,from_status,to_status,reason,changed_by)
    values(new.tenant_id,new.id,case when tg_op='INSERT' then null else old.current_status end,new.current_status,null,auth.uid());
  end if;
  return new;
end $$;
create trigger lead_status_history_capture after insert or update of current_status on public.leads for each row execute function public.axis_record_lead_status();

do $$ declare table_name text; begin
  foreach table_name in array array['traffic_sources','campaigns','buyer_programs','offer_programs','buyer_rules','buyer_caps','lead_deliveries','lead_delivery_attempts','lead_rejections','lead_status_history'] loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.axis_capture_audit_event()',table_name,table_name);
  end loop;
end $$;
