-- Repair Release 4 outcome intelligence aggregates.
-- PostgreSQL does not permit count/sum aggregates inside jsonb_agg at the same query level.

create or replace function public.axis_outcome_intelligence_snapshot(p_tenant_id uuid,p_start timestamptz default null,p_end timestamptz default null,p_preset text default 'last_30_days',p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare v_start timestamptz; v_end timestamptz; v_previous_start timestamptz; v_previous_end timestamptz; v_duration interval; v_result jsonb;
begin
  if auth.uid() is null or not public.axis_is_tenant_member(p_tenant_id) then raise insufficient_privilege using message='Not authorized for tenant outcome intelligence'; end if;
  v_end:=coalesce(p_end,now());
  v_start:=case p_preset when 'today' then date_trunc('day',v_end) when 'yesterday' then date_trunc('day',v_end)-interval '1 day' when 'last_7_days' then date_trunc('day',v_end)-interval '6 days' when 'this_month' then date_trunc('month',v_end) when 'last_month' then date_trunc('month',v_end)-interval '1 month' when 'custom' then coalesce(p_start,date_trunc('day',v_end)-interval '29 days') else date_trunc('day',v_end)-interval '29 days' end;
  if p_preset='yesterday' then v_end:=date_trunc('day',v_end)-interval '1 microsecond'; end if; if p_preset='last_month' then v_end:=date_trunc('month',v_end)-interval '1 microsecond'; end if;
  v_duration:=greatest(v_end-v_start,interval '1 day'); v_previous_end:=v_start-interval '1 microsecond'; v_previous_start:=v_start-v_duration;
  with tenant_leads as (
    select l.* from public.leads l where l.tenant_id=p_tenant_id
      and (nullif(p_filters->>'traffic_source_id','') is null or l.traffic_source_id=nullif(p_filters->>'traffic_source_id','')::uuid)
      and (nullif(p_filters->>'campaign_id','') is null or l.campaign_id=nullif(p_filters->>'campaign_id','')::uuid)
      and (nullif(p_filters->>'program_id','') is null or l.program_id=nullif(p_filters->>'program_id','')::uuid)
      and (nullif(p_filters->>'offer_id','') is null or l.offer_id=nullif(p_filters->>'offer_id','')::uuid)
      and (nullif(p_filters->>'lead_status','') is null or l.current_status=p_filters->>'lead_status')
  ), current_leads as (select * from tenant_leads where received_at between v_start and v_end), previous_leads as (select * from tenant_leads where received_at between v_previous_start and v_previous_end),
  current_outcomes as (select o.* from public.lead_outcomes o join current_leads l on l.id=o.lead_id where o.tenant_id=p_tenant_id and o.occurred_at<=v_end and (nullif(p_filters->>'buyer_id','') is null or o.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)),
  previous_outcomes as (select o.* from public.lead_outcomes o join previous_leads l on l.id=o.lead_id where o.tenant_id=p_tenant_id and o.occurred_at<=v_previous_end and (nullif(p_filters->>'buyer_id','') is null or o.buyer_id=nullif(p_filters->>'buyer_id','')::uuid)),
  summary as (select (select count(*) from current_leads where current_status in ('accepted','recovered'))::numeric accepted,(select count(*) from previous_leads where current_status in ('accepted','recovered'))::numeric previous_accepted,(select count(*) from current_leads)::numeric leads,(select count(*) from previous_leads)::numeric previous_leads)
  select jsonb_build_object(
    'outcomes',jsonb_build_object(
      'contacted',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type='contacted'),(select count(distinct lead_id) from previous_outcomes where outcome_type='contacted')),
      'qualified',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type='qualified'),(select count(distinct lead_id) from previous_outcomes where outcome_type='qualified')),
      'applicationsSales',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type in ('application','sale')),(select count(distinct lead_id) from previous_outcomes where outcome_type in ('application','sale'))),
      'conversions',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type in ('enrollment','sale')),(select count(distinct lead_id) from previous_outcomes where outcome_type in ('enrollment','sale'))),
      'startsCompletions',public.axis_intelligence_metric((select count(distinct lead_id) from current_outcomes where outcome_type in ('start','completed')),(select count(distinct lead_id) from previous_outcomes where outcome_type in ('start','completed'))),
      'revenue',public.axis_intelligence_metric((select sum(monetary_value) from current_outcomes),(select sum(monetary_value) from previous_outcomes)),
      'revenuePerLead',public.axis_intelligence_metric(case when s.leads>0 then (select sum(monetary_value) from current_outcomes)/s.leads end,case when s.previous_leads>0 then (select sum(monetary_value) from previous_outcomes)/s.previous_leads end),
      'revenuePerAcceptedLead',public.axis_intelligence_metric(case when s.accepted>0 then (select sum(monetary_value) from current_outcomes)/s.accepted end,case when s.previous_accepted>0 then (select sum(monetary_value) from previous_outcomes)/s.previous_accepted end),
      'funnel',jsonb_build_array(
        jsonb_build_object('key','accepted','label','Accepted Leads','count',s.accepted,'conversion',case when s.leads>0 then s.accepted/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','contacted','label','Contacted','count',(select count(distinct lead_id) from current_outcomes where outcome_type='contacted'),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type='contacted')/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','qualified','label','Qualified Outcomes','count',(select count(distinct lead_id) from current_outcomes where outcome_type='qualified'),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type='qualified')/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','applications_sales','label','Applications / Sales','count',(select count(distinct lead_id) from current_outcomes where outcome_type in ('application','sale')),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type in ('application','sale'))/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','conversions','label','Conversions','count',(select count(distinct lead_id) from current_outcomes where outcome_type in ('enrollment','sale')),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type in ('enrollment','sale'))/s.leads*100 end,'dropoff',null),
        jsonb_build_object('key','starts_completions','label','Starts / Completions','count',(select count(distinct lead_id) from current_outcomes where outcome_type in ('start','completed')),'conversion',case when s.leads>0 then (select count(distinct lead_id) from current_outcomes where outcome_type in ('start','completed'))/s.leads*100 end,'dropoff',null)
      )
    ),
    'sources',coalesce((select jsonb_agg(jsonb_build_object('sourceId',source_id,'campaignId',campaign_id,'conversions',conversions,'outcomeRevenue',outcome_revenue)) from (select coalesce(l.traffic_source_id::text,'') source_id,coalesce(l.campaign_id::text,'') campaign_id,count(distinct o.lead_id) filter(where o.outcome_type in ('enrollment','sale')) conversions,sum(o.monetary_value) outcome_revenue from current_leads l left join current_outcomes o on o.lead_id=l.id group by l.traffic_source_id,l.campaign_id) source_rows),'[]'::jsonb),
    'buyers',coalesce((select jsonb_agg(jsonb_build_object('buyerId',buyer_id,'qualifiedOutcomes',qualified_outcomes,'applicationsSales',applications_sales,'conversions',conversions,'startsCompletions',starts_completions,'outcomeRevenue',outcome_revenue,'revenuePerLead',revenue_per_lead)) from (select b.id buyer_id,count(distinct o.lead_id) filter(where o.outcome_type='qualified') qualified_outcomes,count(distinct o.lead_id) filter(where o.outcome_type in ('application','sale')) applications_sales,count(distinct o.lead_id) filter(where o.outcome_type in ('enrollment','sale')) conversions,count(distinct o.lead_id) filter(where o.outcome_type in ('start','completed')) starts_completions,sum(o.monetary_value) outcome_revenue,case when count(distinct o.lead_id)>0 then sum(o.monetary_value)/count(distinct o.lead_id) end revenue_per_lead from public.buyers b left join current_outcomes o on o.buyer_id=b.id where b.tenant_id=p_tenant_id group by b.id) buyer_rows),'[]'::jsonb),
    'programs',coalesce((select jsonb_agg(jsonb_build_object('programId',program_id,'conversions',conversions,'outcomeRevenue',outcome_revenue)) from (select p.id program_id,count(distinct o.lead_id) filter(where o.outcome_type in ('enrollment','sale')) conversions,sum(o.monetary_value) outcome_revenue from public.programs p left join current_outcomes o on o.program_id=p.id where p.tenant_id=p_tenant_id group by p.id) program_rows),'[]'::jsonb)
  ) into v_result from summary s;
  return v_result;
end $$;

revoke all on function public.axis_outcome_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) from public;
grant execute on function public.axis_outcome_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) to authenticated;

comment on function public.axis_outcome_intelligence_snapshot(uuid,timestamptz,timestamptz,text,jsonb) is 'Tenant-authorized closed-loop aggregates with grouped dimension rows and no identity data.';
