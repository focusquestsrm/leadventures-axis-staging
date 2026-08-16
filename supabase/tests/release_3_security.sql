-- Transactional Release 3 aggregate isolation, read-only access, and PII validation.
-- Synthetic records only; all changes roll back.
begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('b1000000-0000-4000-8000-000000000001','authenticated','authenticated','r3-viewer-a@example.test','',now(),'{}','{"display_name":"R3 Viewer A"}',now(),now()),
 ('b1000000-0000-4000-8000-000000000002','authenticated','authenticated','r3-admin-b@example.test','',now(),'{}','{"display_name":"R3 Admin B"}',now(),now());
insert into public.tenants(id,name,slug) values
 ('b2000000-0000-4000-8000-000000000001','R3 Synthetic Alpha','r3-synthetic-alpha'),
 ('b2000000-0000-4000-8000-000000000002','R3 Synthetic Beta','r3-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','viewer'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','tenant_admin');
insert into public.traffic_sources(id,tenant_id,name,source_type) values
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','Alpha Intelligence Source','synthetic'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','Beta Private Source','synthetic');
insert into public.leads(id,tenant_id,reference,traffic_source_id,current_status,received_at) values
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','R3-ALPHA-LEAD','b3000000-0000-4000-8000-000000000001','accepted',now()),
 ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','R3-BETA-LEAD','b3000000-0000-4000-8000-000000000002','accepted',now());
insert into public.lead_identity(tenant_id,lead_id,email,phone) values
 ('b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','private-r3@example.test','555-0100');

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
do $$
declare report jsonb;
begin
  report:=public.axis_intelligence_snapshot('b2000000-0000-4000-8000-000000000001',now()-interval '1 day',now()+interval '1 day','custom','{}');
  if (report#>>'{kpis,totalLeads,value}')::numeric <> 1 then raise exception 'Tenant aggregate count is incorrect'; end if;
  if report::text like '%Beta Private Source%' then raise exception 'Tenant A aggregate exposed Tenant B label'; end if;
  if report::text ~* '(private-r3@example.test|555-0100|email|phone|first_name|last_name)' then raise exception 'Analytics response exposed PII'; end if;
  begin
    perform public.axis_intelligence_snapshot('b2000000-0000-4000-8000-000000000002',now()-interval '1 day',now()+interval '1 day','custom','{}');
    raise exception 'Tenant A derived Tenant B intelligence';
  exception when insufficient_privilege then null; end;
  begin
    update public.leads set current_status='rejected' where id='b4000000-0000-4000-8000-000000000001';
    raise exception 'Viewer mutated source data through intelligence access';
  exception when insufficient_privilege then null; end;
end
$$;

reset role;
rollback;
