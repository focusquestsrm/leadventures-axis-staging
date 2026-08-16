-- Lead Ventures Axis — Release 1 foundation (STAGING)
create extension if not exists pgcrypto;

create type public.axis_role as enum ('platform_admin','tenant_admin','manager','media_buyer','analyst','viewer');
create type public.tenant_status as enum ('active','inactive','suspended');
create type public.record_status as enum ('active','inactive','draft','paused','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tenants (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  status public.tenant_status not null default 'active', plan text not null default 'Foundation',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create table public.tenant_branding (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  product_name text, logo_url text, primary_color text, accent_color text, settings jsonb not null default '{}',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, role public.axis_role not null,
  status text not null default 'active' check (status in ('active','invited','disabled')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id,user_id),
  constraint tenant_memberships_no_platform_role check (role <> 'platform_admin')
);
create table public.buyers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, status public.record_status not null default 'active', external_reference text, metadata jsonb not null default '{}',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,name)
);
create table public.programs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, code text not null, category text not null default 'General', status public.record_status not null default 'active',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,code)
);
create table public.offers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null, name text not null, status public.record_status not null default 'draft', terms jsonb not null default '{}',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.buyer_offers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_id uuid not null references public.buyers(id) on delete cascade, offer_id uuid not null references public.offers(id) on delete cascade,
  status public.record_status not null default 'active', configuration jsonb not null default '{}',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,buyer_id,offer_id)
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  reference text not null, source text, campaign_reference text, offer_id uuid references public.offers(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null, status text not null default 'new', lead_score numeric(5,2),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,reference)
);
-- PII is deliberately isolated from operational lead records.
create table public.lead_identity (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null unique references public.leads(id) on delete cascade, first_name text, last_name text, email text, phone text,
  address_line_1 text, address_line_2 text, city text, region text, postal_code text, country_code text,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.lead_attributes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade, attribute_key text not null, attribute_value jsonb not null,
  classification text not null default 'operational' check (classification in ('operational','sensitive')),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,lead_id,attribute_key)
);
create table public.integrations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, kind text not null, status text not null default 'not_configured', config_reference text,
  -- config_reference points to a secrets manager; credentials never belong in this table.
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tenant_settings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  setting_key text not null, setting_value jsonb not null default '{}',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,setting_key)
);
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  flag_key text not null, enabled boolean not null default false, configuration jsonb not null default '{}',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,flag_key)
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null, event_type text not null, entity_type text not null, entity_id uuid,
  occurred_at timestamptz not null default now(), metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index tenant_memberships_user_idx on public.tenant_memberships(user_id,tenant_id) where status='active';
create index leads_tenant_created_idx on public.leads(tenant_id,created_at desc);
create index lead_identity_tenant_lead_idx on public.lead_identity(tenant_id,lead_id);
create index audit_events_tenant_time_idx on public.audit_events(tenant_id,occurred_at desc);
create index buyers_tenant_idx on public.buyers(tenant_id); create index offers_tenant_idx on public.offers(tenant_id);
create index programs_tenant_idx on public.programs(tenant_id); create index integrations_tenant_idx on public.integrations(tenant_id);

create or replace function public.axis_is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_platform_admin from public.profiles where id=auth.uid()),false)
$$;
create or replace function public.axis_is_tenant_member(requested_tenant uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.axis_is_platform_admin() or exists(select 1 from public.tenant_memberships where tenant_id=requested_tenant and user_id=auth.uid() and status='active')
$$;
create or replace function public.axis_has_tenant_role(requested_tenant uuid, allowed_roles public.axis_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select public.axis_is_platform_admin() or exists(select 1 from public.tenant_memberships where tenant_id=requested_tenant and user_id=auth.uid() and status='active' and role=any(allowed_roles))
$$;
create or replace function public.axis_has_direct_tenant_role(requested_tenant uuid, allowed_roles public.axis_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.tenant_memberships where tenant_id=requested_tenant and user_id=auth.uid() and status='active' and role=any(allowed_roles))
$$;
revoke all on function public.axis_is_platform_admin() from public; revoke all on function public.axis_is_tenant_member(uuid) from public; revoke all on function public.axis_has_tenant_role(uuid,public.axis_role[]) from public; revoke all on function public.axis_has_direct_tenant_role(uuid,public.axis_role[]) from public;
grant execute on function public.axis_is_platform_admin(), public.axis_is_tenant_member(uuid), public.axis_has_tenant_role(uuid,public.axis_role[]), public.axis_has_direct_tenant_role(uuid,public.axis_role[]) to authenticated;

create or replace function public.axis_set_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare table_name text; begin foreach table_name in array array['profiles','tenants','tenant_branding','tenant_memberships','buyers','programs','offers','buyer_offers','leads','lead_identity','lead_attributes','integrations','tenant_settings','feature_flags'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.axis_set_updated_at()',table_name); end loop; end $$;

alter table public.profiles enable row level security; alter table public.tenants enable row level security; alter table public.tenant_branding enable row level security;
alter table public.tenant_memberships enable row level security; alter table public.buyers enable row level security; alter table public.programs enable row level security;
alter table public.offers enable row level security; alter table public.buyer_offers enable row level security; alter table public.leads enable row level security;
alter table public.lead_identity enable row level security; alter table public.lead_attributes enable row level security; alter table public.integrations enable row level security;
alter table public.tenant_settings enable row level security; alter table public.feature_flags enable row level security; alter table public.audit_events enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using(id=auth.uid() or public.axis_is_platform_admin());
create policy tenants_read on public.tenants for select to authenticated using(public.axis_is_tenant_member(id));
create policy tenants_platform_insert on public.tenants for insert to authenticated with check(public.axis_is_platform_admin() and created_by=auth.uid());
create policy tenants_manage on public.tenants for update to authenticated using(public.axis_has_tenant_role(id,array['tenant_admin']::public.axis_role[])) with check(public.axis_has_tenant_role(id,array['tenant_admin']::public.axis_role[]));
create policy memberships_read on public.tenant_memberships for select to authenticated using(public.axis_has_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]) or user_id=auth.uid());
create policy memberships_manage on public.tenant_memberships for all to authenticated using(public.axis_has_tenant_role(tenant_id,array['tenant_admin']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array['tenant_admin']::public.axis_role[]));

do $$ declare table_name text; begin foreach table_name in array array['tenant_branding','tenant_settings','feature_flags'] loop
 execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
 execute format('create policy %I_manage on public.%I for all to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'']::public.axis_role[]))',table_name,table_name);
end loop; end $$;
do $$ declare table_name text; begin foreach table_name in array array['buyers','programs','offers','buyer_offers','leads'] loop
 execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
 execute format('create policy %I_write on public.%I for all to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'',''manager'']::public.axis_role[]) and (created_by is null or created_by=auth.uid()))',table_name,table_name);
end loop; end $$;
create policy lead_identity_privileged_read on public.lead_identity for select to authenticated using(public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]));
create policy lead_identity_privileged_write on public.lead_identity for all to authenticated using(public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[])) with check(public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]) and (created_by is null or created_by=auth.uid()));
create policy lead_attributes_read on public.lead_attributes for select to authenticated using(public.axis_is_tenant_member(tenant_id) and (classification='operational' or public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[])));
create policy lead_attributes_write on public.lead_attributes for all to authenticated using(public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[])) with check(public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]));
create policy integrations_read on public.integrations for select to authenticated using(public.axis_is_tenant_member(tenant_id));
create policy integrations_manage on public.integrations for all to authenticated using(public.axis_has_tenant_role(tenant_id,array['tenant_admin']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array['tenant_admin']::public.axis_role[]));
create policy audit_events_read on public.audit_events for select to authenticated using((tenant_id is null and public.axis_is_platform_admin()) or (tenant_id is not null and public.axis_has_tenant_role(tenant_id,array['tenant_admin','manager','analyst']::public.axis_role[])));

-- Grants work with RLS; service_role retains migration/administrative control.
grant select on all tables in schema public to authenticated;
grant insert,update,delete on public.tenants,public.tenant_branding,public.tenant_memberships,public.buyers,public.programs,public.offers,public.buyer_offers,public.leads,public.lead_identity,public.lead_attributes,public.integrations,public.tenant_settings,public.feature_flags to authenticated;

-- Defense against cross-tenant foreign-key references.
create or replace function public.axis_enforce_tenant_fk() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_table_name='offers' and new.program_id is not null and not exists(select 1 from public.programs where id=new.program_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  if tg_table_name='buyer_offers' and (not exists(select 1 from public.buyers where id=new.buyer_id and tenant_id=new.tenant_id) or not exists(select 1 from public.offers where id=new.offer_id and tenant_id=new.tenant_id)) then raise exception 'Invalid tenant relationship'; end if;
  if tg_table_name in ('lead_identity','lead_attributes') and not exists(select 1 from public.leads where id=new.lead_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  if tg_table_name='leads' and new.offer_id is not null and not exists(select 1 from public.offers where id=new.offer_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  if tg_table_name='leads' and new.program_id is not null and not exists(select 1 from public.programs where id=new.program_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship'; end if;
  return new;
end $$;
create trigger offers_tenant_fk before insert or update on public.offers for each row execute function public.axis_enforce_tenant_fk();
create trigger buyer_offers_tenant_fk before insert or update on public.buyer_offers for each row execute function public.axis_enforce_tenant_fk();
create trigger leads_tenant_fk before insert or update on public.leads for each row execute function public.axis_enforce_tenant_fk();
create trigger lead_identity_tenant_fk before insert or update on public.lead_identity for each row execute function public.axis_enforce_tenant_fk();
create trigger lead_attributes_tenant_fk before insert or update on public.lead_attributes for each row execute function public.axis_enforce_tenant_fk();

-- Create a least-privileged profile for every authenticated user. Platform elevation is manual/service-only.
create or replace function public.axis_handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1))); return new; end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.axis_handle_new_user();

-- Generic, PII-safe audit capture. Metadata intentionally contains only the operation.
create or replace function public.axis_capture_audit_event() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data record; event_name text;
begin
  if tg_op='DELETE' then row_data := old; else row_data := new; end if;
  event_name := rtrim(tg_table_name,'s') || '.' || case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
  if tg_table_name='tenant_memberships' and tg_op='INSERT' then event_name := 'membership.created'; end if;
  if tg_table_name='tenant_memberships' and tg_op='DELETE' then event_name := 'membership.removed'; end if;
  if tg_table_name='tenant_memberships' and tg_op='UPDATE' and old.role is distinct from new.role then event_name := 'membership.role_changed'; end if;
  if tg_table_name='tenant_memberships' and tg_op='UPDATE' and old.status is distinct from new.status then event_name := case when new.status='disabled' then 'membership.deactivated' else 'membership.reactivated' end; end if;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(case when tg_table_name='tenants' then row_data.id else row_data.tenant_id end,auth.uid(),event_name,tg_table_name,row_data.id,jsonb_build_object('operation',lower(tg_op)));
  return row_data;
end $$;
do $$ declare table_name text; begin foreach table_name in array array['tenants','tenant_memberships','buyers','offers','programs','buyer_offers','leads','integrations','tenant_settings','feature_flags','tenant_branding'] loop
 execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.axis_capture_audit_event()',table_name,table_name);
end loop; end $$;
