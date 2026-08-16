-- Transactional Release 2 tenant-isolation and delivery-history validation.
-- Synthetic records only; all changes roll back.
begin;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','r2-admin-a@example.test','',now(),'{}','{"display_name":"R2 Admin A"}',now(),now()),
 ('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','r2-admin-b@example.test','',now(),'{}','{"display_name":"R2 Admin B"}',now(),now()),
 ('a1000000-0000-4000-8000-000000000003','authenticated','authenticated','r2-viewer-a@example.test','',now(),'{}','{"display_name":"R2 Viewer A"}',now(),now());

insert into public.tenants(id,name,slug) values
 ('a2000000-0000-4000-8000-000000000001','R2 Synthetic Alpha','r2-synthetic-alpha'),
 ('a2000000-0000-4000-8000-000000000002','R2 Synthetic Beta','r2-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','tenant_admin'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','tenant_admin'),
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','viewer');

insert into public.traffic_sources(id,tenant_id,name,source_type) values
 ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Alpha Source','synthetic'),
 ('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','Beta Source','synthetic');
insert into public.campaigns(id,tenant_id,traffic_source_id,name) values
 ('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','Alpha Campaign'),
 ('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000002','Beta Campaign');
insert into public.programs(id,tenant_id,name,code) values
 ('a5000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Alpha Program','R2-ALPHA'),
 ('a5000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','Beta Program','R2-BETA');
insert into public.buyers(id,tenant_id,name) values
 ('a6000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Alpha Buyer'),
 ('a6000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','Beta Buyer');
insert into public.buyer_programs(tenant_id,buyer_id,program_id,payout,priority) values
 ('a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001',50,10);
insert into public.buyer_caps(tenant_id,buyer_id,program_id,cap_type,period_start,period_end,limit_value,delivered_value) values
 ('a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','daily',date_trunc('day',now()),date_trunc('day',now())+interval '1 day',100,20),
 ('a2000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000002','daily',date_trunc('day',now()),date_trunc('day',now())+interval '1 day',100,10);
insert into public.leads(id,tenant_id,reference,traffic_source_id,campaign_id,program_id,current_status,quality_score) values
 ('a7000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','R2-ALPHA-LEAD','a3000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','delivering',90),
 ('a7000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000002','R2-BETA-LEAD','a3000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000002','new',75);
insert into public.lead_identity(tenant_id,lead_id,email) values
 ('a2000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','synthetic-alpha@example.test');
insert into public.lead_deliveries(id,tenant_id,lead_id,status,started_at) values
 ('a8000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','in_progress',now());
insert into public.lead_delivery_attempts(id,tenant_id,lead_delivery_id,lead_id,buyer_id,program_id,attempt_number,delivery_method,status) values
 ('a9000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001',1,'host_post','rejected'),
 ('a9000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a8000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001',2,'host_post','accepted');
insert into public.lead_rejections(tenant_id,lead_id,delivery_attempt_id,buyer_id,rejection_category,reason,recoverable) values
 ('a2000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','cap','Synthetic cap reached',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.campaigns where tenant_id='a2000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B campaigns'; end if;
  if (select count(*) from public.buyer_caps where tenant_id='a2000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B caps'; end if;
  if (select count(*) from public.lead_delivery_attempts where tenant_id='a2000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Tenant A read Tenant B attempts'; end if;
  if (select count(*) from public.lead_delivery_attempts where lead_id='a7000000-0000-4000-8000-000000000001') <> 2 then raise exception 'Multiple attempts not preserved'; end if;
  if (select array_agg(attempt_number order by attempt_number) from public.lead_delivery_attempts where lead_id='a7000000-0000-4000-8000-000000000001') <> array[1,2] then raise exception 'Attempt order not preserved'; end if;
  if not exists(select 1 from public.lead_rejections where delivery_attempt_id='a9000000-0000-4000-8000-000000000001') then raise exception 'Rejection lost attempt association'; end if;
  if not exists(select 1 from public.lead_status_history where lead_id='a7000000-0000-4000-8000-000000000001' and to_status='delivering') then raise exception 'Initial status history missing'; end if;
  insert into public.buyer_caps(tenant_id,buyer_id,cap_type,period_start,period_end,limit_value) values('a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000001','weekly',now(),now()+interval '7 days',500);
  begin
    insert into public.buyer_programs(tenant_id,buyer_id,program_id) values('a2000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000001');
    raise exception 'Cross-tenant buyer-program mapping accepted';
  exception when raise_exception then if sqlerrm <> 'Invalid tenant relationship' then raise; end if; end;
  begin
    insert into public.lead_deliveries(tenant_id,lead_id) values('a2000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000002');
    raise exception 'Cross-tenant lead delivery accepted';
  exception when raise_exception then if sqlerrm <> 'Invalid tenant relationship' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
do $$ begin
  begin
    insert into public.campaigns(tenant_id,name) values('a2000000-0000-4000-8000-000000000001','Viewer Write');
    raise exception 'Viewer performed restricted R2 write';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('lead_deliveries','lead_delivery_attempts','lead_rejections','lead_status_history') and column_name in ('email','phone','first_name','last_name','address_line_1','raw_payload','request_body','response_body')) then raise exception 'PII or raw payload column exists in delivery records'; end if;
end $$;

rollback;
