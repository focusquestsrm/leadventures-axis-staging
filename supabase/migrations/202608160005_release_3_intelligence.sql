-- Lead Ventures Axis Release 3: tenant-safe operational intelligence.
-- This migration adds read-only aggregation only. It does not modify R2 records or RLS.

create index if not exists leads_tenant_received_intelligence_idx on public.leads(tenant_id,received_at desc);
create index if not exists leads_tenant_dimensions_intelligence_idx on public.leads(tenant_id,traffic_source_id,campaign_id,program_id,offer_id,current_status);
create index if not exists attempts_tenant_created_intelligence_idx on public.lead_delivery_attempts(tenant_id,created_at desc);
create index if not exists rejections_tenant_created_intelligence_idx on public.lead_rejections(tenant_id,created_at desc);
create index if not exists caps_tenant_status_intelligence_idx on public.buyer_caps(tenant_id,status,buyer_id,program_id);

create or replace function public.axis_intelligence_metric(p_value numeric, p_previous numeric, p_kind text default 'percent')
returns jsonb
language sql
immutable
set search_path=public
as $$
  select jsonb_build_object(
    'value',round(p_value,1),
    'previous',round(p_previous,1),
    'change',case
      when p_value is null or p_previous is null then null
      when p_kind='points' then round(p_value-p_previous,1)
      when p_previous=0 then null
      else round(((p_value-p_previous)/abs(p_previous))*100,1)
    end,
    'changeKind',p_kind
  )
$$;

create or replace function public.axis_intelligence_snapshot(
  p_tenant_id uuid,
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_preset text default 'last_30_days',
  p_filters jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_previous_start timestamptz;
  v_previous_end timestamptz;
  v_duration interval;
  v_report jsonb;
begin
  if auth.uid() is null or not public.axis_is_tenant_member(p_tenant_id) then
    raise insufficient_privilege using message='Not authorized for tenant intelligence';
  end if;

  v_end := coalesce(p_end,now());
  v_start := case p_preset
    when 'today' then date_trunc('day',v_end)
    when 'yesterday' then date_trunc('day',v_end)-interval '1 day'
    when 'last_7_days' then date_trunc('day',v_end)-interval '6 days'
    when 'this_month' then date_trunc('month',v_end)
    when 'last_month' then date_trunc('month',v_end)-interval '1 month'
    when 'custom' then coalesce(p_start,date_trunc('day',v_end)-interval '29 days')
    else date_trunc('day',v_end)-interval '29 days'
  end;
  if p_preset='yesterday' then v_end:=date_trunc('day',v_end)-interval '1 microsecond'; end if;
  if p_preset='last_month' then v_end:=date_trunc('month',v_end)-interval '1 microsecond'; end if;
  v_duration:=greatest(v_end-v_start,interval '1 day');
  v_previous_end:=v_start-interval '1 microsecond';
  v_previous_start:=v_start-v_duration;

  with tenant_leads as (
    select l.*
    from public.leads l
    where l.tenant_id=p_tenant_id
      and (nullif(p_filters->>'traffic_source_id','') is null or l.traffic_source_id=nullif(p_filters->>'traffic_source_id','')::uuid)
      and (nullif(p_filters->>'campaign_id','') is null or l.campaign_id=nullif(p_filters->>'campaign_id','')::uuid)
      and (nullif(p_filters->>'program_id','') is null or l.program_id=nullif(p_filters->>'program_id','')::uuid)
      and (nullif(p_filters->>'offer_id','') is null or l.offer_id=nullif(p_filters->>'offer_id','')::uuid)
      and (nullif(p_filters->>'lead_status','') is null or l.current_status=p_filters->>'lead_status')
      and (nullif(p_filters->>'buyer_id','') is null or exists(
        select 1 from public.lead_delivery_attempts ba
        where ba.tenant_id=p_tenant_id and ba.lead_id=l.id and ba.buyer_id=nullif(p_filters->>'buyer_id','')::uuid
      ))
  ), current_leads as (
    select * from tenant_leads where received_at between v_start and v_end
  ), previous_leads as (
    select * from tenant_leads where received_at between v_previous_start and v_previous_end
  ), current_attempts as (
    select a.* from public.lead_delivery_attempts a join current_leads l on l.id=a.lead_id
    where a.tenant_id=p_tenant_id and (nullif(p_filters->>'buyer_id','') is null or a.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)
  ), previous_attempts as (
    select a.* from public.lead_delivery_attempts a join previous_leads l on l.id=a.lead_id
    where a.tenant_id=p_tenant_id and (nullif(p_filters->>'buyer_id','') is null or a.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)
  ), current_rejections as (
    select r.* from public.lead_rejections r join current_leads l on l.id=r.lead_id
    where r.tenant_id=p_tenant_id and (nullif(p_filters->>'buyer_id','') is null or r.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)
  ), previous_rejections as (
    select r.* from public.lead_rejections r join previous_leads l on l.id=r.lead_id
    where r.tenant_id=p_tenant_id and (nullif(p_filters->>'buyer_id','') is null or r.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)
  ), counts as (
    select
      (select count(*) from current_leads)::numeric total_leads,
      (select count(*) from previous_leads)::numeric previous_total_leads,
      (select count(*) from current_leads where current_status in ('accepted','recovered'))::numeric accepted_leads,
      (select count(*) from previous_leads where current_status in ('accepted','recovered'))::numeric previous_accepted_leads,
      (select count(*) from current_leads where current_status='rejected')::numeric rejected_leads,
      (select count(*) from previous_leads where current_status='rejected')::numeric previous_rejected_leads,
      (select count(*) from current_rejections where recoverable)::numeric recoverable,
      (select count(*) from previous_rejections where recoverable)::numeric previous_recoverable,
      (select avg(response_time_ms) from current_attempts where response_time_ms is not null)::numeric average_response,
      (select avg(response_time_ms) from previous_attempts where response_time_ms is not null)::numeric previous_average_response,
      (select count(*) from current_attempts)::numeric attempts,
      (select count(*) from previous_attempts)::numeric previous_attempts,
      (select count(*) from current_attempts where status='timeout')::numeric timeouts,
      (select count(*) from previous_attempts where status='timeout')::numeric previous_timeouts,
      (select sum(payout) from current_attempts where status='accepted' and payout is not null)::numeric revenue,
      (select sum(payout) from previous_attempts where status='accepted' and payout is not null)::numeric previous_revenue
  ), cap_totals as (
    select coalesce(sum(limit_value),0)::numeric cap_limit,coalesce(sum(delivered_value),0)::numeric cap_delivered
    from public.buyer_caps
    where tenant_id=p_tenant_id and status='active'
      and (nullif(p_filters->>'buyer_id','') is null or buyer_id=nullif(p_filters->>'buyer_id','')::uuid)
      and (nullif(p_filters->>'program_id','') is null or program_id=nullif(p_filters->>'program_id','')::uuid)
  )
  select jsonb_build_object(
    'tenantId',p_tenant_id,
    'range',jsonb_build_object('start',v_start,'end',v_end,'previousStart',v_previous_start,'previousEnd',v_previous_end),
    'kpis',jsonb_build_object(
      'totalLeads',public.axis_intelligence_metric(c.total_leads,c.previous_total_leads),
      'acceptedLeads',public.axis_intelligence_metric(c.accepted_leads,c.previous_accepted_leads),
      'rejectedLeads',public.axis_intelligence_metric(c.rejected_leads,c.previous_rejected_leads),
      'acceptanceRate',public.axis_intelligence_metric(case when c.total_leads>0 then c.accepted_leads/c.total_leads*100 end,case when c.previous_total_leads>0 then c.previous_accepted_leads/c.previous_total_leads*100 end,'points'),
      'rejectionRate',public.axis_intelligence_metric(case when c.total_leads>0 then c.rejected_leads/c.total_leads*100 end,case when c.previous_total_leads>0 then c.previous_rejected_leads/c.previous_total_leads*100 end,'points'),
      'recoveryOpportunity',public.axis_intelligence_metric(c.recoverable,c.previous_recoverable),
      'averageResponseMs',public.axis_intelligence_metric(c.average_response,c.previous_average_response),
      'timeoutRate',public.axis_intelligence_metric(case when c.attempts>0 then c.timeouts/c.attempts*100 end,case when c.previous_attempts>0 then c.previous_timeouts/c.previous_attempts*100 end,'points'),
      'activeBuyers',public.axis_intelligence_metric((select count(*) from public.buyers where tenant_id=p_tenant_id and status='active'),null),
      'capacityUtilization',public.axis_intelligence_metric(case when ct.cap_limit>0 then ct.cap_delivered/ct.cap_limit*100 end,null,'points'),
      'estimatedRevenue',public.axis_intelligence_metric(c.revenue,c.previous_revenue)
    ),
    'funnel',jsonb_build_array(
      jsonb_build_object('key','leads_received','label','Leads Received','count',c.total_leads,'conversion',case when c.total_leads>0 then 100 end,'dropoff',null),
      jsonb_build_object('key','validated','label','Validated','count',(select count(*) from current_leads where current_status in ('validated','queued','delivering','accepted','rejected','recovered','closed')),'conversion',case when c.total_leads>0 then (select count(*) from current_leads where current_status in ('validated','queued','delivering','accepted','rejected','recovered','closed'))/c.total_leads*100 end,'dropoff',null),
      jsonb_build_object('key','delivery_attempted','label','Delivery Attempted','count',(select count(distinct lead_id) from current_attempts),'conversion',case when c.total_leads>0 then (select count(distinct lead_id) from current_attempts)/c.total_leads*100 end,'dropoff',null),
      jsonb_build_object('key','accepted','label','Accepted','count',c.accepted_leads,'conversion',case when c.total_leads>0 then c.accepted_leads/c.total_leads*100 end,'dropoff',null),
      jsonb_build_object('key','rejected_unmatched','label','Rejected / Unmatched','count',c.rejected_leads,'conversion',case when c.total_leads>0 then c.rejected_leads/c.total_leads*100 end,'dropoff',null)
    ),
    'trends',coalesce((select jsonb_agg(jsonb_build_object('label',t.trend_day,'leads',t.leads,'accepted',t.accepted,'rejected',t.rejected,'acceptanceRate',case when t.leads>0 then round(t.accepted::numeric/t.leads*100,1) end) order by t.trend_day) from (select received_at::date as trend_day,count(*) as leads,count(*) filter(where current_status in ('accepted','recovered')) as accepted,count(*) filter(where current_status='rejected') as rejected from current_leads group by received_at::date) t),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(jsonb_build_object('sourceId',source_id,'source',source_name,'campaignId',campaign_id,'campaign',campaign_name,'leads',leads,'accepted',accepted,'rejected',rejected,'acceptanceRate',case when leads>0 then round(accepted::numeric/leads*100,1) end,'averageResponseMs',average_response) order by leads desc) from (select coalesce(l.traffic_source_id::text,'') source_id,coalesce(ts.name,'Unknown / Unclassified') source_name,coalesce(l.campaign_id::text,'') campaign_id,coalesce(ca.name,'Unknown / Unclassified') campaign_name,count(distinct l.id) leads,count(distinct l.id) filter(where l.current_status in ('accepted','recovered')) accepted,count(distinct l.id) filter(where l.current_status='rejected') rejected,round(avg(a.response_time_ms)) average_response from current_leads l left join public.traffic_sources ts on ts.id=l.traffic_source_id and ts.tenant_id=p_tenant_id left join public.campaigns ca on ca.id=l.campaign_id and ca.tenant_id=p_tenant_id left join current_attempts a on a.lead_id=l.id group by l.traffic_source_id,ts.name,l.campaign_id,ca.name) s),'[]'::jsonb),
    'buyers',coalesce((select jsonb_agg(jsonb_build_object('buyerId',buyer_id,'buyer',buyer_name,'attempted',attempted,'accepted',accepted,'rejected',rejected,'acceptanceRate',case when attempted>0 then round(accepted::numeric/attempted*100,1) end,'averageResponseMs',average_response,'cap',cap_limit,'delivered',cap_delivered,'remaining',greatest(0,cap_limit-cap_delivered),'utilization',case when cap_limit>0 then round(cap_delivered::numeric/cap_limit*100,1) end,'capacityStatus',case when buyer_status<>'active' then 'inactive' when cap_limit=0 then 'unconfigured' when cap_delivered>=cap_limit then 'at_cap' when cap_delivered::numeric/cap_limit>=.85 then 'approaching_cap' else 'healthy' end,'topRejectionReason',top_rejection,'revenue',revenue) order by attempted desc) from (select b.id::text buyer_id,b.name buyer_name,b.status::text buyer_status,count(distinct a.id) attempted,count(distinct a.id) filter(where a.status='accepted') accepted,count(distinct a.id) filter(where a.status='rejected') rejected,round(avg(a.response_time_ms)) average_response,coalesce((select sum(limit_value) from public.buyer_caps bc where bc.tenant_id=p_tenant_id and bc.buyer_id=b.id and bc.status='active'),0) cap_limit,coalesce((select sum(delivered_value) from public.buyer_caps bc where bc.tenant_id=p_tenant_id and bc.buyer_id=b.id and bc.status='active'),0) cap_delivered,coalesce((select initcap(replace(nullif(trim(r.rejection_category),''),'_',' ')) from current_rejections r where r.buyer_id=b.id group by r.rejection_category order by count(*) desc limit 1),'Unknown / Unclassified') top_rejection,sum(a.payout) filter(where a.status='accepted' and a.payout is not null) revenue from public.buyers b left join current_attempts a on a.buyer_id=b.id where b.tenant_id=p_tenant_id and (nullif(p_filters->>'buyer_id','') is null or b.id=nullif(p_filters->>'buyer_id','')::uuid) group by b.id,b.name,b.status) bs),'[]'::jsonb),
    'programs',coalesce((select jsonb_agg(jsonb_build_object('programId',program_id,'program',program_name,'leads',leads,'attempts',attempts,'accepted',accepted,'rejected',rejected,'acceptanceRate',case when attempts>0 then round(accepted::numeric/attempts*100,1) end,'activeBuyers',active_buyers,'remainingCapacity',remaining_capacity,'topRejectionReason',top_rejection,'revenue',revenue) order by leads desc) from (select p.id::text program_id,p.name program_name,count(distinct l.id) leads,count(distinct a.id) attempts,count(distinct a.id) filter(where a.status='accepted') accepted,count(distinct a.id) filter(where a.status='rejected') rejected,(select count(distinct bp.buyer_id) from public.buyer_programs bp where bp.tenant_id=p_tenant_id and bp.program_id=p.id and bp.status='active') active_buyers,coalesce((select sum(greatest(0,limit_value-delivered_value)) from public.buyer_caps bc where bc.tenant_id=p_tenant_id and bc.program_id=p.id and bc.status='active'),0) remaining_capacity,coalesce((select initcap(replace(nullif(trim(r.rejection_category),''),'_',' ')) from current_rejections r join current_attempts ra on ra.id=r.delivery_attempt_id where ra.program_id=p.id group by r.rejection_category order by count(*) desc limit 1),'Unknown / Unclassified') top_rejection,sum(a.payout) filter(where a.status='accepted' and a.payout is not null) revenue from public.programs p left join current_leads l on l.program_id=p.id left join current_attempts a on a.lead_id=l.id where p.tenant_id=p_tenant_id and (nullif(p_filters->>'program_id','') is null or p.id=nullif(p_filters->>'program_id','')::uuid) group by p.id,p.name) ps),'[]'::jsonb),
    'rejectionCategories',coalesce((select jsonb_agg(jsonb_build_object('key',category,'label',case when category='unknown' then 'Unknown / Unclassified' else initcap(replace(category,'_',' ')) end,'count',count,'recoverable',recoverable) order by count desc) from (select coalesce(nullif(lower(trim(rejection_category)),''),'unknown') category,count(*) count,count(*) filter(where recoverable) recoverable from current_rejections group by 1) rc),'[]'::jsonb),
    'rejectionBuyers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'label',b.name,'count',x.count) order by x.count desc) from (select buyer_id,count(*) count from current_rejections group by buyer_id) x join public.buyers b on b.id=x.buyer_id and b.tenant_id=p_tenant_id),'[]'::jsonb),
    'rejectionPrograms',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'label',p.name,'count',x.count) order by x.count desc) from (select a.program_id,count(*) count from current_rejections r join current_attempts a on a.id=r.delivery_attempt_id group by a.program_id) x join public.programs p on p.id=x.program_id and p.tenant_id=p_tenant_id),'[]'::jsonb),
    'recoverableSources',coalesce((select jsonb_agg(jsonb_build_object('id',coalesce(ts.id::text,''),'label',coalesce(ts.name,'Unknown / Unclassified'),'count',x.count) order by x.count desc) from (select l.traffic_source_id,count(*) count from current_rejections r join current_leads l on l.id=r.lead_id where r.recoverable group by l.traffic_source_id) x left join public.traffic_sources ts on ts.id=x.traffic_source_id and ts.tenant_id=p_tenant_id),'[]'::jsonb),
    'recoverablePrograms',coalesce((select jsonb_agg(jsonb_build_object('id',coalesce(p.id::text,''),'label',coalesce(p.name,'Unknown / Unclassified'),'count',x.count) order by x.count desc) from (select l.program_id,count(*) count from current_rejections r join current_leads l on l.id=r.lead_id where r.recoverable group by l.program_id) x left join public.programs p on p.id=x.program_id and p.tenant_id=p_tenant_id),'[]'::jsonb),
    'dataQuality',jsonb_build_object('missingSource',(select count(*) from current_leads where traffic_source_id is null),'missingCampaign',(select count(*) from current_leads where campaign_id is null),'missingProgram',(select count(*) from current_leads where program_id is null),'missingResponseTime',(select count(*) from current_attempts where response_time_ms is null),'unknownRejectionReason',(select count(*) from current_rejections where nullif(trim(rejection_category),'') is null))
  ) into v_report
  from counts c cross join cap_totals ct;

  return v_report;
end
$$;

revoke all on function public.axis_intelligence_metric(numeric,numeric,text) from public;
revoke all on function public.axis_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) from public;
grant execute on function public.axis_intelligence_metric(numeric,numeric,text) to authenticated;
grant execute on function public.axis_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) to authenticated;

comment on function public.axis_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) is
'Read-only, tenant-authorized Release 3 aggregation. Returns operational IDs and aggregate labels only; never lead identity or PII.';
