-- Transactional Release 6 tenant isolation, approval, and append-only validation.
begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('e1000000-0000-4000-8000-000000000001','authenticated','authenticated','r6-manager-a@example.test','',now(),'{}','{"display_name":"R6 Manager A"}',now(),now()),
 ('e1000000-0000-4000-8000-000000000002','authenticated','authenticated','r6-viewer-a@example.test','',now(),'{}','{"display_name":"R6 Viewer A"}',now(),now()),
 ('e1000000-0000-4000-8000-000000000003','authenticated','authenticated','r6-admin-b@example.test','',now(),'{}','{"display_name":"R6 Admin B"}',now(),now());
insert into public.tenants(id,name,slug) values('e2000000-0000-4000-8000-000000000001','R6 Synthetic Alpha','r6-synthetic-alpha'),('e2000000-0000-4000-8000-000000000002','R6 Synthetic Beta','r6-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','manager'),
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000002','viewer'),
 ('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000003','tenant_admin');
insert into public.optimization_settings(tenant_id) values('e2000000-0000-4000-8000-000000000001'),('e2000000-0000-4000-8000-000000000002');
insert into public.metric_snapshots(tenant_id,snapshot_date,dimension_type,leads,accepted,rejected,spend,revenue) values
 ('e2000000-0000-4000-8000-000000000001',current_date,'tenant',100,60,40,2000,5000),
 ('e2000000-0000-4000-8000-000000000002',current_date,'tenant',80,50,30,1800,4000);
insert into public.recommendations(id,tenant_id,recommendation_type,title,summary,priority,confidence,sample_size,evidence,estimated_impact,freshness,idempotency_key) values
 ('e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','capacity','Synthetic Alpha pacing','Review approved capacity.','high','medium',100,'["Aggregate pacing evidence."]','{"potentialLeadsPreserved":20}','fresh','R6-ALPHA-1'),
 ('e3000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000002','capacity','Synthetic Beta pacing','Review approved capacity.','high','medium',80,'["Aggregate pacing evidence."]','{"potentialLeadsPreserved":15}','fresh','R6-BETA-1');

set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.recommendations)<>1 then raise exception 'Viewer saw another tenant recommendation';end if;
  if (select count(*) from public.metric_snapshots)<>1 then raise exception 'Viewer saw another tenant metric snapshot';end if;
  begin perform public.axis_decide_recommendation('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','approved','Viewer approval');raise exception 'Viewer approved recommendation';exception when insufficient_privilege then null;end;
  begin insert into public.recommendation_actions(tenant_id,recommendation_id,action_type) values('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','reviewed');raise exception 'Viewer wrote action';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb;begin
  begin insert into public.recommendation_actions(tenant_id,recommendation_id,action_type) values('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000002','reviewed');raise exception 'Cross-tenant recommendation action accepted';exception when others then if sqlerrm='Cross-tenant recommendation action accepted' then raise;end if;end;
  result:=public.axis_decide_recommendation('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','approved','Approved synthetic recommendation.');
  if result->>'status'<>'approved' then raise exception 'Approval was not recorded';end if;
  result:=public.axis_decide_recommendation('e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','approved','Repeated approval.');
  if coalesce((result->>'idempotent')::boolean,false)<>true then raise exception 'Repeated recommendation decision was not idempotent';end if;
  begin update public.recommendation_actions set notes='Tampered';raise exception 'Recommendation action was mutable';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('optimization_settings','metric_snapshots','forecasts','forecast_results','optimization_anomalies','recommendations','recommendation_actions') and column_name in ('email','phone','first_name','last_name','address','raw_payload','auth_token','jwt','secret')) then raise exception 'PII or secret column exists in optimization records';end if;
end $$;
rollback;
