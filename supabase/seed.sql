-- OPTIONAL STAGING/LOCAL SEED. Synthetic data only. Safe to remove or reset.
-- Run after creating a demo auth user/profile. The earliest staging profile becomes tenant admin.
do $$
declare demo_tenant uuid := '10000000-0000-4000-8000-000000000001'; demo_program uuid := '30000000-0000-4000-8000-000000000001'; demo_offer uuid := '40000000-0000-4000-8000-000000000001'; demo_user uuid;
begin
  select id into demo_user from public.profiles order by created_at limit 1;
  if demo_user is null then raise exception 'Create a staging Auth user before running the optional seed'; end if;
  insert into public.tenants(id,name,slug,status,plan) values(demo_tenant,'FocusQuest Demo','focusquest-demo','active','Growth') on conflict do nothing;
  insert into public.tenant_memberships(tenant_id,user_id,role,status) values(demo_tenant,demo_user,'tenant_admin','active') on conflict do nothing;
  insert into public.programs(id,tenant_id,name,code,status) values(demo_program,demo_tenant,'Career Pathways','CAREER-PATH','active') on conflict do nothing;
  insert into public.offers(id,tenant_id,program_id,name,status) values(demo_offer,demo_tenant,demo_program,'Qualified Education Inquiry','active') on conflict do nothing;
  insert into public.buyers(id,tenant_id,name,status) values('50000000-0000-4000-8000-000000000001',demo_tenant,'Meridian Education Demo','active') on conflict do nothing;
  insert into public.leads(id,tenant_id,reference,source,program_id,offer_id,status,lead_score) values
    ('60000000-0000-4000-8000-000000000001',demo_tenant,'AX-DEMO-001','Synthetic paid search',demo_program,demo_offer,'qualified',91),
    ('60000000-0000-4000-8000-000000000002',demo_tenant,'AX-DEMO-002','Synthetic organic',demo_program,demo_offer,'new',78)
  on conflict do nothing;
  insert into public.lead_identity(id,tenant_id,lead_id,first_name,last_name,email,phone) values
    ('70000000-0000-4000-8000-000000000001',demo_tenant,'60000000-0000-4000-8000-000000000001','Demo','Person','demo.person@example.test','+1-202-555-0100') on conflict do nothing;
end $$;

-- Release 2 synthetic lead ecosystem. This block only enriches the optional demo tenant.
do $$
declare demo_tenant uuid := '10000000-0000-4000-8000-000000000001'; demo_user uuid;
begin
  if not exists(select 1 from public.tenants where id=demo_tenant) then return; end if;
  select user_id into demo_user from public.tenant_memberships where tenant_id=demo_tenant and status='active' order by created_at limit 1;

  update public.programs set name='Medical Assistant',code='MED-ASST',category='Healthcare',status='active' where id='30000000-0000-4000-8000-000000000001' and tenant_id=demo_tenant;
  insert into public.programs(id,tenant_id,name,code,category,status,created_by) values
    ('30000000-0000-4000-8000-000000000002',demo_tenant,'Pharmacy Technician','PHARM-TECH','Healthcare','active',demo_user),
    ('30000000-0000-4000-8000-000000000003',demo_tenant,'Psychology','PSYCH','Behavioral Science','active',demo_user)
  on conflict (id) do update set name=excluded.name,code=excluded.code,category=excluded.category,status=excluded.status;

  insert into public.traffic_sources(id,tenant_id,name,source_type,external_id,status,notes,created_by) values
    ('31000000-0000-4000-8000-000000000001',demo_tenant,'Meta','meta','src-meta-demo','active','Synthetic paid social source.',demo_user),
    ('31000000-0000-4000-8000-000000000002',demo_tenant,'Google','google','src-google-demo','active','Synthetic paid search source.',demo_user)
  on conflict (id) do update set name=excluded.name,source_type=excluded.source_type,external_id=excluded.external_id,status=excluded.status,notes=excluded.notes;
  insert into public.campaigns(id,tenant_id,traffic_source_id,name,external_id,status,campaign_type,start_date,created_by) values
    ('32000000-0000-4000-8000-000000000001',demo_tenant,'31000000-0000-4000-8000-000000000001','Healthcare Careers','cmp-health-demo','active','lead_generation','2026-08-01',demo_user),
    ('32000000-0000-4000-8000-000000000002',demo_tenant,'31000000-0000-4000-8000-000000000002','Psychology Programs','cmp-psych-demo','active','search','2026-08-05',demo_user)
  on conflict (id) do update set traffic_source_id=excluded.traffic_source_id,name=excluded.name,external_id=excluded.external_id,status=excluded.status,campaign_type=excluded.campaign_type,start_date=excluded.start_date;

  update public.buyers set name='Northstar University',external_reference='BUY-NORTHSTAR',buyer_type='education',delivery_method='ping_post',default_payout=62,currency='USD',duplicate_window_days=30,exclusive=false,timezone='America/New_York',operating_notes='Synthetic buyer profile.' where id='50000000-0000-4000-8000-000000000001' and tenant_id=demo_tenant;
  insert into public.buyers(id,tenant_id,name,status,external_reference,buyer_type,delivery_method,default_payout,currency,duplicate_window_days,exclusive,timezone,operating_notes,created_by) values
    ('50000000-0000-4000-8000-000000000002',demo_tenant,'Meridian Career Institute','active','BUY-MERIDIAN','career_training','host_post',58,'USD',14,true,'America/Chicago','Synthetic buyer profile.',demo_user),
    ('50000000-0000-4000-8000-000000000003',demo_tenant,'Summit Online','active','BUY-SUMMIT','online_education','host_post',48,'USD',30,false,'America/Denver','Synthetic buyer profile.',demo_user)
  on conflict (id) do update set name=excluded.name,status=excluded.status,external_reference=excluded.external_reference,buyer_type=excluded.buyer_type,delivery_method=excluded.delivery_method,default_payout=excluded.default_payout,currency=excluded.currency,duplicate_window_days=excluded.duplicate_window_days,exclusive=excluded.exclusive,timezone=excluded.timezone,operating_notes=excluded.operating_notes;

  insert into public.buyer_programs(id,tenant_id,buyer_id,program_id,status,payout,priority,created_by) values
    ('51000000-0000-4000-8000-000000000001',demo_tenant,'50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','active',62,10,demo_user),
    ('51000000-0000-4000-8000-000000000002',demo_tenant,'50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','active',58,20,demo_user),
    ('51000000-0000-4000-8000-000000000003',demo_tenant,'50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','active',48,30,demo_user)
  on conflict (id) do update set status=excluded.status,payout=excluded.payout,priority=excluded.priority;
  insert into public.buyer_caps(id,tenant_id,buyer_id,program_id,cap_type,period_start,period_end,limit_value,delivered_value,status,created_by) values
    ('52000000-0000-4000-8000-000000000001',demo_tenant,'50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','monthly','2026-08-01','2026-09-01',1200,1188,'active',demo_user),
    ('52000000-0000-4000-8000-000000000002',demo_tenant,'50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','daily','2026-08-16','2026-08-17',90,54,'active',demo_user),
    ('52000000-0000-4000-8000-000000000003',demo_tenant,'50000000-0000-4000-8000-000000000003',null,'weekly','2026-08-11','2026-08-18',350,214,'active',demo_user)
  on conflict (id) do update set limit_value=excluded.limit_value,delivered_value=excluded.delivered_value,status=excluded.status;

  update public.leads set traffic_source_id='31000000-0000-4000-8000-000000000001',campaign_id='32000000-0000-4000-8000-000000000001',program_id='30000000-0000-4000-8000-000000000001',current_status='accepted',quality_score=91,external_lead_id='SYN-LEAD-001',received_at=created_at where id='60000000-0000-4000-8000-000000000001';
  update public.leads set traffic_source_id='31000000-0000-4000-8000-000000000002',campaign_id='32000000-0000-4000-8000-000000000001',program_id='30000000-0000-4000-8000-000000000002',current_status='rejected',quality_score=78,external_lead_id='SYN-LEAD-002',received_at=created_at where id='60000000-0000-4000-8000-000000000002';
  insert into public.leads(id,tenant_id,reference,external_lead_id,traffic_source_id,campaign_id,program_id,current_status,quality_score,created_by) values
    ('60000000-0000-4000-8000-000000000003',demo_tenant,'AX-DEMO-003','SYN-LEAD-003','31000000-0000-4000-8000-000000000002','32000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','delivering',84,demo_user)
  on conflict (id) do update set current_status=excluded.current_status,quality_score=excluded.quality_score;

  insert into public.lead_deliveries(id,tenant_id,lead_id,status,started_at,completed_at,created_by) values
    ('61000000-0000-4000-8000-000000000001',demo_tenant,'60000000-0000-4000-8000-000000000001','accepted','2026-08-16 10:03:00-04','2026-08-16 10:03:04-04',demo_user),
    ('61000000-0000-4000-8000-000000000002',demo_tenant,'60000000-0000-4000-8000-000000000002','exhausted','2026-08-16 10:05:00-04','2026-08-16 10:05:07-04',demo_user),
    ('61000000-0000-4000-8000-000000000003',demo_tenant,'60000000-0000-4000-8000-000000000003','error','2026-08-16 10:07:00-04','2026-08-16 10:07:30-04',demo_user)
  on conflict (id) do update set status=excluded.status,started_at=excluded.started_at,completed_at=excluded.completed_at;
  insert into public.lead_delivery_attempts(id,tenant_id,lead_delivery_id,lead_id,buyer_id,program_id,attempt_number,delivery_method,status,response_time_ms,external_reference,payout,created_by) values
    ('62000000-0000-4000-8000-000000000001',demo_tenant,'61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1,'ping_post','rejected',842,'SYN-ATT-001',null,demo_user),
    ('62000000-0000-4000-8000-000000000002',demo_tenant,'61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',2,'host_post','accepted',1640,'SYN-ATT-002',58,demo_user),
    ('62000000-0000-4000-8000-000000000003',demo_tenant,'61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',1,'ping_post','rejected',620,'SYN-ATT-003',null,demo_user),
    ('62000000-0000-4000-8000-000000000004',demo_tenant,'61000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003',1,'host_post','timeout',30000,'SYN-ATT-004',null,demo_user)
  on conflict (id) do update set status=excluded.status,response_time_ms=excluded.response_time_ms,payout=excluded.payout;
  insert into public.lead_rejections(id,tenant_id,lead_id,delivery_attempt_id,buyer_id,rejection_code,rejection_category,reason,recoverable,created_by) values
    ('63000000-0000-4000-8000-000000000001',demo_tenant,'60000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','CAP_MONTHLY','cap','Monthly allocation reached',true,demo_user),
    ('63000000-0000-4000-8000-000000000002',demo_tenant,'60000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001','GEO_OUTSIDE','geography','Region outside current eligibility',true,demo_user)
  on conflict (id) do update set rejection_code=excluded.rejection_code,rejection_category=excluded.rejection_category,reason=excluded.reason,recoverable=excluded.recoverable;
end $$;
