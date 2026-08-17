-- Transactional Release 8 tenant isolation, approval, execution, idempotency,
-- PII protection, kill-switch, and capability validation.
begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('81000000-0000-4000-8000-000000000001','authenticated','authenticated','r8-admin-a@example.test','',now(),'{}','{"display_name":"R8 Admin A"}',now(),now()),
 ('81000000-0000-4000-8000-000000000002','authenticated','authenticated','r8-manager-a@example.test','',now(),'{}','{"display_name":"R8 Manager A"}',now(),now()),
 ('81000000-0000-4000-8000-000000000003','authenticated','authenticated','r8-viewer-a@example.test','',now(),'{}','{"display_name":"R8 Viewer A"}',now(),now()),
 ('81000000-0000-4000-8000-000000000004','authenticated','authenticated','r8-media-a@example.test','',now(),'{}','{"display_name":"R8 Media A"}',now(),now()),
 ('81000000-0000-4000-8000-000000000005','authenticated','authenticated','r8-admin-b@example.test','',now(),'{}','{"display_name":"R8 Admin B"}',now(),now());
insert into public.tenants(id,name,slug) values('82000000-0000-4000-8000-000000000001','R8 Synthetic Alpha','r8-synthetic-alpha'),('82000000-0000-4000-8000-000000000002','R8 Synthetic Beta','r8-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','tenant_admin'),('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000002','manager'),('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000003','viewer'),('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000004','media_buyer'),('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000005','tenant_admin');
insert into public.integrations(id,tenant_id,name,kind,status) values('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','R8 Synthetic Connector A','api','connected'),('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','R8 Synthetic Connector B','api','connected');

set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
insert into public.automation_policies(id,tenant_id,name,engine,action_type,mode,status,approval_required,required_approvals,limits,created_by) values
 ('84000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','R8 Retry Policy','integration','retry_sync','approval_required','active',true,1,'{"maxActionsPerPeriod":5,"periodMinutes":60,"cooldownMinutes":0}','81000000-0000-4000-8000-000000000001'),
 ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','R8 Four Eyes','integration','retry_sync','approval_required','active',true,2,'{"maxActionsPerPeriod":5,"periodMinutes":60,"cooldownMinutes":0}','81000000-0000-4000-8000-000000000001');
insert into public.automation_actions(id,tenant_id,policy_id,engine,action_type,target_type,target_id,target_label,status,requested_by,parameters,previous_state,proposed_state,evidence,idempotency_key,confidence,sample_size,freshness,required_approvals,rollback_status) values
 ('85000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','integration','retry_sync','integration','83000000-0000-4000-8000-000000000001','Synthetic Connector A','awaiting_approval','81000000-0000-4000-8000-000000000001','{"retry":true}','{}','{"sync":"requested"}','["Synthetic integration failed once."]','r8-alpha-retry-001','high',100,'fresh',1,'not_available'),
 ('85000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000002','integration','retry_sync','integration','83000000-0000-4000-8000-000000000001','Synthetic Connector A','awaiting_approval','81000000-0000-4000-8000-000000000001','{"retry":true}','{}','{"sync":"requested"}','["Four-eyes synthetic action."]','r8-alpha-retry-002','high',100,'fresh',2,'not_available');

select public.axis_decide_automation_action('82000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','approved','Reviewed synthetic evidence.');
do $$ declare result jsonb;begin
 result:=public.axis_simulate_automation_action('82000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001');if result->>'status'<>'succeeded' or result->>'mode'<>'simulated' then raise exception 'Simulated execution failed';end if;
 result:=public.axis_simulate_automation_action('82000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001');if (result->>'idempotent')::boolean is not true then raise exception 'Execution was not idempotent';end if;
end $$;

select public.axis_decide_automation_action('82000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002','approved','First approval.');
do $$ begin if (select status from public.automation_actions where id='85000000-0000-4000-8000-000000000002')<>'awaiting_approval' then raise exception 'Four-eyes action approved too early';end if;end $$;
select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true);
select public.axis_decide_automation_action('82000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002','approved','Second approval.');
do $$ begin if (select status from public.automation_actions where id='85000000-0000-4000-8000-000000000002')<>'approved' then raise exception 'Four-eyes action not approved';end if;end $$;

select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000003',true);
do $$ begin
 if (select count(*) from public.automation_actions)<>2 then raise exception 'Viewer saw another tenant automation action';end if;
 begin perform public.axis_decide_automation_action('82000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002','approved','Viewer attempt.');raise exception 'Viewer approved automation';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000004',true);
do $$ begin
 begin insert into public.automation_actions(tenant_id,policy_id,engine,action_type,target_type,target_id,target_label,status,requested_by,idempotency_key) values('82000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','route','shift_buyer_allocation','integration','83000000-0000-4000-8000-000000000001','Blocked','draft','81000000-0000-4000-8000-000000000004','r8-media-route-block');raise exception 'Media buyer created Route action';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin insert into public.automation_actions(tenant_id,policy_id,engine,action_type,target_type,target_id,target_label,status,requested_by,idempotency_key) values('82000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','integration','retry_sync','integration','83000000-0000-4000-8000-000000000002','Cross tenant','draft','81000000-0000-4000-8000-000000000001','r8-cross-tenant-target');raise exception 'Cross-tenant target accepted';exception when others then if sqlerrm='Cross-tenant target accepted' then raise;end if;end;
 begin insert into public.automation_actions(tenant_id,policy_id,engine,action_type,target_type,target_id,target_label,status,requested_by,parameters,idempotency_key) values('82000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','integration','retry_sync','integration','83000000-0000-4000-8000-000000000001','PII blocked','draft','81000000-0000-4000-8000-000000000001','{"email":"synthetic@example.test"}','r8-pii-blocked');raise exception 'PII metadata accepted';exception when check_violation then null;end;
end $$;

select public.axis_set_automation_kill_switch('82000000-0000-4000-8000-000000000001',true,'Synthetic emergency test.');
do $$ begin if not (select kill_switch_enabled from public.automation_settings where tenant_id='82000000-0000-4000-8000-000000000001') then raise exception 'Kill switch was not enabled';end if;end $$;

reset role;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name like 'automation_%' and column_name in ('email','phone','first_name','last_name','address','access_token','refresh_token','client_secret','raw_payload')) then raise exception 'PII or credential column exists in automation records';end if;
end $$;
rollback;
