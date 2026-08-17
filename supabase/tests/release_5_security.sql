-- Transactional Release 5 tenant-isolation, approval, and append-only validation.
-- Synthetic records only; all changes roll back.
begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('d1000000-0000-4000-8000-000000000001','authenticated','authenticated','r5-manager-a@example.test','',now(),'{}','{"display_name":"R5 Manager A"}',now(),now()),
 ('d1000000-0000-4000-8000-000000000002','authenticated','authenticated','r5-viewer-a@example.test','',now(),'{}','{"display_name":"R5 Viewer A"}',now(),now()),
 ('d1000000-0000-4000-8000-000000000003','authenticated','authenticated','r5-admin-b@example.test','',now(),'{}','{"display_name":"R5 Admin B"}',now(),now());
insert into public.tenants(id,name,slug) values
 ('d2000000-0000-4000-8000-000000000001','R5 Synthetic Alpha','r5-synthetic-alpha'),
 ('d2000000-0000-4000-8000-000000000002','R5 Synthetic Beta','r5-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','manager'),
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','viewer'),
 ('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000003','tenant_admin');
insert into public.leads(id,tenant_id,reference,current_status,received_at) values
 ('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','R5-ALPHA','rejected',now()),
 ('d3000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','R5-BETA','rejected',now());
insert into public.lead_rejections(id,tenant_id,lead_id,rejection_category,reason,recoverable) values
 ('d4000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','cap','Synthetic capacity rejection',true),
 ('d4000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000002','cap','Synthetic capacity rejection',true);
insert into public.recovery_policies(id,tenant_id,name,rejection_category,allow_secondary_host_post) values
 ('d5000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','Alpha capacity recovery','cap',true),
 ('d5000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','Beta capacity recovery','cap',true);
insert into public.recovery_paths(id,tenant_id,recovery_policy_id,path_type,priority) values
 ('d6000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001','manual_review',10),
 ('d6000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000002','manual_review',10);
insert into public.lead_recoveries(id,tenant_id,lead_id,originating_rejection_id,recovery_policy_id,consent_status,secondary_delivery_allowed,eligibility_code,explanation,recommended_path_id,idempotency_key) values
 ('d7000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001','confirmed',true,'ELIGIBLE','["Synthetic capacity rejection is recoverable."]','d6000000-0000-4000-8000-000000000001','R5-ALPHA-1'),
 ('d7000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000002','confirmed',true,'ELIGIBLE','["Synthetic capacity rejection is recoverable."]','d6000000-0000-4000-8000-000000000002','R5-BETA-1');

set local role authenticated;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.lead_recoveries)<>1 then raise exception 'Viewer saw another tenant recovery';end if;
  begin insert into public.recovery_policies(tenant_id,name,rejection_category) values('d2000000-0000-4000-8000-000000000001','Viewer write','cap');raise exception 'Viewer changed recovery policy';exception when insufficient_privilege then null;end;
  begin perform public.axis_decide_recovery('d2000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','approve','d6000000-0000-4000-8000-000000000001','Viewer decision');raise exception 'Viewer approved recovery';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb;begin
  begin insert into public.recovery_paths(tenant_id,recovery_policy_id,path_type,priority) values('d2000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000002','manual_review',50);raise exception 'Cross-tenant policy path accepted';exception when others then if sqlerrm='Cross-tenant policy path accepted' then raise;end if;end;
  result:=public.axis_decide_recovery('d2000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','approve','d6000000-0000-4000-8000-000000000001','Approved synthetic path.');
  if result->>'status'<>'queued' then raise exception 'Approval did not queue recovery';end if;
  result:=public.axis_decide_recovery('d2000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','approve','d6000000-0000-4000-8000-000000000001','Repeated approval.');
  if coalesce((result->>'idempotent')::boolean,false)<>true then raise exception 'Repeated approval was not idempotent';end if;
  if public.axis_recovery_intelligence_snapshot('d2000000-0000-4000-8000-000000000001')::text ~* '(email|phone|first_name|last_name|r5-beta-1)' then raise exception 'Recovery intelligence exposed PII or another tenant';end if;
  begin update public.recovery_events set safe_detail='Tampered' where tenant_id='d2000000-0000-4000-8000-000000000001';raise exception 'Recovery event was mutable';exception when insufficient_privilege then null;end;
end $$;

reset role;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('recovery_policies','recovery_paths','lead_recoveries','recovery_attempts','recovery_reviews','recovery_events') and column_name in ('email','phone','first_name','last_name','address','raw_payload','request_body','response_body','auth_token','jwt')) then raise exception 'PII, payload, or secret column exists in recovery records';end if;
end $$;
rollback;
