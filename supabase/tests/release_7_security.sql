-- Transactional Release 7 tenant isolation, RBAC, import idempotency, and PII validation.
begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','r7-media-a@example.test','',now(),'{}','{"display_name":"R7 Media A"}',now(),now()),
 ('f1000000-0000-4000-8000-000000000002','authenticated','authenticated','r7-viewer-a@example.test','',now(),'{}','{"display_name":"R7 Viewer A"}',now(),now()),
 ('f1000000-0000-4000-8000-000000000003','authenticated','authenticated','r7-admin-b@example.test','',now(),'{}','{"display_name":"R7 Admin B"}',now(),now());
insert into public.tenants(id,name,slug) values('f2000000-0000-4000-8000-000000000001','R7 Synthetic Alpha','r7-synthetic-alpha'),('f2000000-0000-4000-8000-000000000002','R7 Synthetic Beta','r7-synthetic-beta');
insert into public.tenant_memberships(tenant_id,user_id,role) values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','media_buyer'),('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','viewer'),('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000003','tenant_admin');
insert into public.integrations(id,tenant_id,name,kind,category,vendor,status) values('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','R7 Meta Alpha','Media platform','media','Meta Ads','not_configured'),('f3000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','R7 Google Beta','Media platform','media','Google Ads','not_configured');
insert into public.media_accounts(id,tenant_id,integration_id,platform,external_account_id,display_name,status) values('f4000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','meta','alpha-account','Alpha Media','configured'),('f4000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000002','google_ads','beta-account','Beta Media','configured');
insert into public.media_campaigns(id,tenant_id,media_account_id,external_campaign_id,name,platform) values('f5000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000001','alpha-campaign','Alpha Campaign','meta'),('f5000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','f4000000-0000-4000-8000-000000000002','beta-campaign','Beta Campaign','google_ads');
insert into public.media_daily_metrics(tenant_id,media_account_id,media_campaign_id,metric_date,idempotency_key,impressions,clicks,spend,leads) values('f2000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001',current_date,'alpha-existing',1000,100,200,10),('f2000000-0000-4000-8000-000000000002','f4000000-0000-4000-8000-000000000002','f5000000-0000-4000-8000-000000000002',current_date,'beta-existing',900,80,180,8);

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from public.media_accounts)<>1 then raise exception 'Viewer saw another tenant media account';end if;
 if (select coalesce(sum(spend),0) from public.media_daily_metrics)<>200 then raise exception 'Viewer saw another tenant spend';end if;
 begin insert into public.media_campaigns(tenant_id,media_account_id,external_campaign_id,name,platform) values('f2000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000001','viewer-write','Blocked','meta');raise exception 'Viewer mutated acquisition configuration';exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $$ declare result jsonb;records jsonb;begin
 begin insert into public.media_campaigns(tenant_id,media_account_id,external_campaign_id,name,platform) values('f2000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000002','cross-tenant','Blocked','meta');raise exception 'Cross-tenant account accepted';exception when others then if sqlerrm='Cross-tenant account accepted' then raise;end if;end;
 records:=jsonb_build_array(jsonb_build_object('platform','meta','externalAccountId','alpha-account','externalCampaignId','alpha-imported','campaignName','Imported Campaign','metricDate',current_date::text,'currency','USD','impressions',1200,'clicks',110,'spend',220,'platformConversions',18,'reach',900,'frequency',1.3,'externalAdGroupId','','externalAdId','','externalCreativeId','','idempotencyKey','alpha-imported-day'));
 result:=public.axis_finalize_media_import('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001',records);
 if (result->>'status')<>'completed' then raise exception 'Media buyer import failed';end if;
 perform public.axis_finalize_media_import('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001',records);
 if (select count(*) from public.media_daily_metrics where tenant_id='f2000000-0000-4000-8000-000000000001' and idempotency_key='alpha-imported-day')<>1 then raise exception 'Media metric import was not idempotent';end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('media_accounts','media_campaigns','media_ad_groups','media_ads','media_creatives','media_daily_metrics','media_sync_runs','landing_pages','lead_acquisition_attributions','experiments','experiment_variants') and column_name in ('email','phone','first_name','last_name','address','access_token','refresh_token','client_secret','raw_payload')) then raise exception 'PII or credential column exists in acquisition records';end if;
end $$;
rollback;
