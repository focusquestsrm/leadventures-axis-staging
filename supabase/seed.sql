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
