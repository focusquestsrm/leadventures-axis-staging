-- Transactional Release 4 tenant-isolation and least-privilege validation.
-- Synthetic records only; all changes roll back.
begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('c1000000-0000-4000-8000-000000000001','authenticated','authenticated','r4-manager-a@example.test','',now(),'{}','{"display_name":"R4 Manager A"}',now(),now()),
 ('c1000000-0000-4000-8000-000000000002','authenticated','authenticated','r4-viewer-a@example.test','',now(),'{}','{"display_name":"R4 Viewer A"}',now(),now()),
 ('c1000000-0000-4000-8000-000000000003','authenticated','authenticated','r4-admin-b@example.test','',now(),'{}','{"display_name":"R4 Admin B"}',now(),now());
insert into public.tenants(id,name,slug) values
 ('c2000000-0000-4000-8000-000000000001','R4 Synthetic Alpha','r4-synthetic-alpha'),
 ('c2000000-0000-4000-8000-000000000002','R4 Synthetic Beta','r4-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','manager'),
 ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','viewer'),
 ('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000003','tenant_admin');
insert into public.integrations(id,tenant_id,name,kind,category,vendor,status) values
 ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Alpha Lead Distribution','file','lead_distribution','Synthetic','connected'),
 ('c3000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','Beta CRM','api','crm','Synthetic','connected');
insert into public.leads(id,tenant_id,reference,current_status,received_at) values
 ('c4000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','R4-ALPHA','accepted',now()),
 ('c4000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','R4-BETA','accepted',now());
insert into public.integration_field_mappings(id,tenant_id,integration_id,external_field,axis_field) values
 ('c5000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','lead_id','external_lead_id'),
 ('c5000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000002','contact_id','external_lead_id');
insert into public.integration_import_batches(id,tenant_id,integration_id,file_name,status) values
 ('c6000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','alpha.csv','completed'),
 ('c6000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000002','beta.csv','completed');
insert into public.lead_outcomes(tenant_id,lead_id,integration_id,external_outcome_id,outcome_type,outcome_stage,occurred_at,source_system,external_record_id) values
 ('c2000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000002','BETA-PRIVATE','sale','Conversion',now(),'Synthetic CRM','BETA-PRIVATE');

set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.integration_field_mappings)<>1 then raise exception 'Viewer saw another tenant field mapping'; end if;
  if (select count(*) from public.integration_import_batches)<>1 then raise exception 'Viewer saw another tenant import batch'; end if;
  if (select count(*) from public.lead_outcomes)<>0 then raise exception 'Viewer saw another tenant outcome'; end if;
  begin insert into public.integration_field_mappings(tenant_id,integration_id,external_field,axis_field) values('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','status','status'); raise exception 'Viewer changed integration configuration'; exception when insufficient_privilege then null; end;
  begin perform public.axis_outcome_intelligence_snapshot('c2000000-0000-4000-8000-000000000002',null,null,'last_30_days','{}'); raise exception 'Viewer derived another tenant outcomes'; exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
do $$ begin
  begin insert into public.integration_field_mappings(tenant_id,integration_id,external_field,axis_field,created_by) values('c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002','status','status','c1000000-0000-4000-8000-000000000001'); raise exception 'Cross-tenant integration relation accepted'; exception when others then if sqlerrm='Cross-tenant integration relation accepted' then raise; end if; end;
  if public.axis_outcome_intelligence_snapshot('c2000000-0000-4000-8000-000000000001',null,null,'last_30_days','{}')::text ~* '(email|phone|first_name|last_name|beta-private)' then raise exception 'Outcome intelligence exposed PII or another tenant'; end if;
end $$;

reset role;
rollback;
