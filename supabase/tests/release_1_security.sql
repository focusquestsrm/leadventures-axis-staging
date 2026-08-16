-- Transactional Release 1 RLS validation. Synthetic records only; all changes roll back.
-- Run against a migrated staging/local Supabase database with psql and ON_ERROR_STOP=1.
begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('91000000-0000-4000-8000-000000000001','authenticated','authenticated','platform@example.test','',now(),'{}','{"display_name":"Platform Tester"}',now(),now()),
 ('91000000-0000-4000-8000-000000000002','authenticated','authenticated','admin-a@example.test','',now(),'{}','{"display_name":"Admin A"}',now(),now()),
 ('91000000-0000-4000-8000-000000000003','authenticated','authenticated','admin-b@example.test','',now(),'{}','{"display_name":"Admin B"}',now(),now()),
 ('91000000-0000-4000-8000-000000000004','authenticated','authenticated','viewer-a@example.test','',now(),'{}','{"display_name":"Viewer A"}',now(),now()),
 ('91000000-0000-4000-8000-000000000005','authenticated','authenticated','outsider@example.test','',now(),'{}','{"display_name":"Outsider"}',now(),now());
update public.profiles set is_platform_admin=true where id='91000000-0000-4000-8000-000000000001';
insert into public.tenants(id,name,slug) values ('92000000-0000-4000-8000-000000000001','Axis Demo Alpha','axis-demo-alpha'),('92000000-0000-4000-8000-000000000002','Axis Demo Beta','axis-demo-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','tenant_admin'),
 ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003','tenant_admin'),
 ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000004','viewer');
insert into public.programs(id,tenant_id,name,code) values ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Alpha Program','ALPHA'),('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Beta Program','BETA');
insert into public.buyers(id,tenant_id,name) values ('94000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Alpha Buyer'),('94000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Beta Buyer');
insert into public.offers(id,tenant_id,program_id,name) values ('94500000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Alpha Offer'),('94500000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000002','Beta Offer');
insert into public.integrations(id,tenant_id,name,kind) values ('94600000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Alpha API','API'),('94600000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Beta API','API');
insert into public.tenant_settings(tenant_id,setting_key,setting_value) values ('92000000-0000-4000-8000-000000000001','locale','{"value":"en-US"}'),('92000000-0000-4000-8000-000000000002','locale','{"value":"en-CA"}');
insert into public.leads(id,tenant_id,reference) values ('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','ALPHA-LEAD'),('95000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','BETA-LEAD');
insert into public.lead_identity(tenant_id,lead_id,email,phone) values ('92000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','alpha@example.test','+1-202-555-0101'),('92000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000002','beta@example.test','+1-202-555-0102');

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.leads where tenant_id='92000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B leads'; end if;
  if (select count(*) from public.lead_identity where tenant_id='92000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B identity'; end if;
  if (select count(*) from public.buyers where tenant_id='92000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B buyers'; end if;
  if (select count(*) from public.offers where tenant_id='92000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B offers'; end if;
  if (select count(*) from public.integrations where tenant_id='92000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B integrations'; end if;
  if (select count(*) from public.tenant_settings where tenant_id='92000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B settings'; end if;
  update public.buyers set name='blocked' where id='94000000-0000-4000-8000-000000000002';
  if found then raise exception 'Tenant A mutated Tenant B buyer'; end if;
  delete from public.buyers where id='94000000-0000-4000-8000-000000000002';
  if found then raise exception 'Tenant A deleted Tenant B buyer'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
do $$ begin
  if (select count(*) from public.leads where tenant_id='92000000-0000-4000-8000-000000000001') <> 0 then raise exception 'Tenant B read Tenant A leads'; end if;
  if (select count(*) from public.buyers where tenant_id='92000000-0000-4000-8000-000000000001') <> 0 then raise exception 'Tenant B read Tenant A buyers'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);

do $$ begin
  begin
    insert into public.tenant_memberships(tenant_id,user_id,role) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000005','platform_admin');
    raise exception 'Tenant admin granted platform_admin';
  exception when check_violation then null; end;
  begin
    insert into public.offers(tenant_id,program_id,name) values('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','Cross Tenant Offer');
    raise exception 'Cross-tenant program relationship accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid tenant relationship' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',true);
do $$ begin
  update public.leads set status='qualified' where id='95000000-0000-4000-8000-000000000001';
  if found then raise exception 'Viewer performed restricted write'; end if;
  if (select count(*) from public.lead_identity) <> 0 then raise exception 'Viewer read lead identity'; end if;
  begin update public.audit_events set metadata='{}'; raise exception 'Audit update unexpectedly succeeded'; exception when insufficient_privilege then null; end;
end $$;

-- Platform administration does not imply PII access without a direct privileged membership.
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.tenants) <> 2 then raise exception 'Platform admin cross-tenant administration failed'; end if;
  if (select count(*) from public.lead_identity) <> 0 then raise exception 'Platform admin received implicit PII access'; end if;
end $$;

rollback;
