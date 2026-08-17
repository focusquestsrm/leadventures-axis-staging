-- Lead Ventures Axis Release 8: bounded automation and orchestration.
-- External credentials remain server-side. Browser callers may approve records,
-- but only trusted execution functions/adapters may perform connector mutations.

create or replace function public.axis_automation_json_is_safe(value jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare item record;
begin
  if jsonb_typeof(value)='object' then
    for item in select key,val from jsonb_each(value) as entry(key,val) loop
      if item.key ~* '(^|_)(email|phone|first_?name|last_?name|address|ssn|dob|birth|password|secret|token|jwt|authorization|credential|api_?key)($|_)'
        or not public.axis_automation_json_is_safe(item.val) then return false; end if;
    end loop;
  elsif jsonb_typeof(value)='array' then
    for item in select element as val from jsonb_array_elements(value) as entry(element) loop
      if not public.axis_automation_json_is_safe(item.val) then return false; end if;
    end loop;
  elsif jsonb_typeof(value)='string' and trim(both '"' from value::text) ~* '(bearer[[:space:]]+[a-z0-9._~-]+|eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,})' then return false;
  end if;
  return true;
end $$;

create table public.automation_settings (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  default_mode text not null default 'advisory' check(default_mode in ('advisory','approval_required','bounded_auto','disabled')),
  kill_switch_enabled boolean not null default false,freshness_behavior text not null default 'require_approval' check(freshness_behavior in ('warn','require_approval','block')),
  minimum_auto_confidence text not null default 'high' check(minimum_auto_confidence in ('low','medium','high')),minimum_sample_size integer not null default 30 check(minimum_sample_size between 3 and 100000),
  execution_mode text not null default 'simulated' check(execution_mode in ('simulated','live')),created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table public.automation_policies (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,name text not null,
  engine text not null check(engine in ('acquire','convert','route','recover','optimize','integration')),
  action_type text not null check(action_type in ('pause_campaign','resume_campaign','increase_budget','decrease_budget','change_campaign_status','shift_buyer_allocation','pause_buyer_delivery','resume_buyer_delivery','change_routing_weight','approve_recovery','execute_recovery_path','pause_recovery_path','acknowledge_recommendation','approve_recommendation','execute_recommendation','activate_experiment_variant','pause_experiment','declare_experiment_winner','retry_sync','pause_sync','resume_sync')),
  mode text not null default 'advisory' check(mode in ('advisory','approval_required','bounded_auto','disabled')),status text not null default 'draft' check(status in ('active','paused','draft')),priority integer not null default 100 check(priority between 1 and 10000),
  conditions jsonb not null default '{}',limits jsonb not null default '{"maxActionsPerPeriod":1,"periodMinutes":60,"cooldownMinutes":60}',approval_required boolean not null default true,required_approvals integer not null default 1 check(required_approvals between 1 and 5),
  created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint automation_policy_safe_json check(jsonb_typeof(conditions)='object' and jsonb_typeof(limits)='object' and pg_column_size(conditions)<=8192 and pg_column_size(limits)<=8192 and public.axis_automation_json_is_safe(conditions) and public.axis_automation_json_is_safe(limits)),
  constraint automation_policy_limit_values check(coalesce((limits->>'maxActionsPerPeriod')::integer,1) between 1 and 100000 and coalesce((limits->>'periodMinutes')::integer,60) between 1 and 44640 and coalesce((limits->>'cooldownMinutes')::integer,0) between 0 and 525600 and coalesce((limits->>'maxPercentageIncrease')::numeric,0) between 0 and 1000 and coalesce((limits->>'maxPercentageDecrease')::numeric,0) between 0 and 100),unique(tenant_id,name)
);

create table public.automation_actions (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,policy_id uuid not null references public.automation_policies(id) on delete restrict,recommendation_id uuid references public.recommendations(id) on delete set null,
  engine text not null check(engine in ('acquire','convert','route','recover','optimize','integration')),action_type text not null check(action_type in ('pause_campaign','resume_campaign','increase_budget','decrease_budget','change_campaign_status','shift_buyer_allocation','pause_buyer_delivery','resume_buyer_delivery','change_routing_weight','approve_recovery','execute_recovery_path','pause_recovery_path','acknowledge_recommendation','approve_recommendation','execute_recommendation','activate_experiment_variant','pause_experiment','declare_experiment_winner','retry_sync','pause_sync','resume_sync')),target_type text not null check(target_type in ('media_campaign','buyer','lead_recovery','recommendation','experiment','integration')),target_id uuid not null,target_label text not null default '',
  status text not null default 'draft' check(status in ('draft','awaiting_approval','approved','scheduled','executing','succeeded','partially_succeeded','failed','cancelled','rolled_back','expired','blocked')),priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  requested_by uuid references public.profiles(id),approved_by uuid references public.profiles(id),executed_by uuid references public.profiles(id),created_at timestamptz not null default now(),approved_at timestamptz,executed_at timestamptz,completed_at timestamptz,expires_at timestamptz,
  parameters jsonb not null default '{}',previous_state jsonb not null default '{}',proposed_state jsonb not null default '{}',evidence jsonb not null default '[]',expected_impact jsonb not null default '{}',actual_impact jsonb,impact_basis text check(impact_basis in ('estimated','observed','verified')),
  confidence text not null default 'low' check(confidence in ('low','medium','high')),sample_size integer not null default 0 check(sample_size>=0),freshness text not null default 'unknown' check(freshness in ('fresh','delayed','stale','unknown')),risk text not null default 'medium' check(risk in ('low','medium','high','critical')),
  idempotency_key text not null,required_approvals integer not null default 1 check(required_approvals between 1 and 5),approval_count integer not null default 0,rollback_status text not null default 'not_available' check(rollback_status in ('available','not_available','requested','executing','succeeded','failed')),failure_code text,failure_message text,
  constraint automation_action_safe_text check(length(target_label)<=250 and length(idempotency_key) between 8 and 250 and (failure_code is null or length(failure_code)<=100) and (failure_message is null or length(failure_message)<=500)),
  constraint automation_action_approval_count check(approval_count between 0 and required_approvals),
  constraint automation_action_engine_type check((engine='acquire' and action_type in ('pause_campaign','resume_campaign','increase_budget','decrease_budget','change_campaign_status')) or (engine='convert' and action_type in ('activate_experiment_variant','pause_experiment','declare_experiment_winner')) or (engine='route' and action_type in ('shift_buyer_allocation','pause_buyer_delivery','resume_buyer_delivery','change_routing_weight')) or (engine='recover' and action_type in ('approve_recovery','execute_recovery_path','pause_recovery_path')) or (engine='optimize' and action_type in ('acknowledge_recommendation','approve_recommendation','execute_recommendation')) or (engine='integration' and action_type in ('retry_sync','pause_sync','resume_sync'))),
  constraint automation_action_safe_json check(jsonb_typeof(parameters)='object' and jsonb_typeof(previous_state)='object' and jsonb_typeof(proposed_state)='object' and jsonb_typeof(evidence)='array' and jsonb_typeof(expected_impact)='object' and (actual_impact is null or jsonb_typeof(actual_impact)='object') and pg_column_size(parameters)<=8192 and pg_column_size(evidence)<=8192 and public.axis_automation_json_is_safe(parameters) and public.axis_automation_json_is_safe(previous_state) and public.axis_automation_json_is_safe(proposed_state) and public.axis_automation_json_is_safe(evidence)),
  unique(tenant_id,idempotency_key)
);

create table public.automation_approvals (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,action_id uuid not null references public.automation_actions(id) on delete restrict,
  decision text not null check(decision in ('approved','rejected')),decided_by uuid not null references public.profiles(id),safe_note text not null default '',decided_at timestamptz not null default now(),constraint automation_approval_safe check(length(safe_note)<=500),unique(action_id,decided_by)
);

create table public.automation_executions (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,action_id uuid not null references public.automation_actions(id) on delete restrict,
  execution_mode text not null check(execution_mode in ('simulated','live')),status text not null check(status in ('executing','succeeded','partially_succeeded','failed','blocked')),idempotency_key text not null,
  previous_state jsonb not null default '{}',requested_state jsonb not null default '{}',connector_status text not null default '',safe_error_code text,rollback_available boolean not null default false,started_at timestamptz not null default now(),completed_at timestamptz,
  constraint automation_execution_safe check(length(connector_status)<=250 and (safe_error_code is null or length(safe_error_code)<=100) and public.axis_automation_json_is_safe(previous_state) and public.axis_automation_json_is_safe(requested_state)),unique(tenant_id,idempotency_key)
);

create table public.automation_rollbacks (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,action_id uuid not null references public.automation_actions(id) on delete restrict,execution_id uuid not null references public.automation_executions(id) on delete restrict,
  status text not null check(status in ('requested','executing','succeeded','failed')),restore_state jsonb not null default '{}',safe_reason text not null default '',requested_by uuid references public.profiles(id),requested_at timestamptz not null default now(),completed_at timestamptz,
  constraint automation_rollback_safe check(length(safe_reason)<=500 and public.axis_automation_json_is_safe(restore_state)),unique(tenant_id,action_id,execution_id)
);

create table public.automation_circuit_breakers (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,engine text not null check(engine in ('acquire','convert','route','recover','optimize','integration')),action_type text,
  status text not null default 'open' check(status in ('open','reviewing','resolved')),reason_code text not null,safe_reason text not null,evidence jsonb not null default '{}',triggered_at timestamptz not null default now(),resolved_by uuid references public.profiles(id),resolved_at timestamptz,
  constraint automation_breaker_safe check(length(reason_code)<=100 and length(safe_reason)<=500 and pg_column_size(evidence)<=8192 and public.axis_automation_json_is_safe(evidence))
);

create table public.automation_notifications (
  id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,type text not null check(type in ('approval_required','action_failed','circuit_breaker','automation_paused','rollback_failed','threshold_reached')),severity text not null check(severity in ('info','warning','critical')),
  title text not null,safe_message text not null,action_id uuid references public.automation_actions(id) on delete set null,read_at timestamptz,created_at timestamptz not null default now(),constraint automation_notification_safe check(length(title)<=200 and length(safe_message)<=500)
);

create table public.platform_automation_controls (
  control_key text primary key check(control_key in ('all_outbound','media_mutations','automated_recovery')),suspended boolean not null default false,safe_reason text not null default '',updated_by uuid references public.profiles(id),updated_at timestamptz not null default now(),constraint platform_control_safe check(length(safe_reason)<=500)
);

insert into public.automation_settings(tenant_id) select id from public.tenants on conflict(tenant_id) do nothing;
insert into public.platform_automation_controls(control_key) values('all_outbound'),('media_mutations'),('automated_recovery') on conflict(control_key) do nothing;

create index automation_policies_engine_idx on public.automation_policies(tenant_id,engine,status,priority);
create index automation_actions_queue_idx on public.automation_actions(tenant_id,status,priority,created_at desc);
create index automation_actions_target_idx on public.automation_actions(tenant_id,target_type,target_id,created_at desc);
create index automation_actions_recommendation_idx on public.automation_actions(tenant_id,recommendation_id) where recommendation_id is not null;
create index automation_approvals_action_idx on public.automation_approvals(tenant_id,action_id,decided_at);
create index automation_executions_history_idx on public.automation_executions(tenant_id,started_at desc,status);
create index automation_rollbacks_history_idx on public.automation_rollbacks(tenant_id,requested_at desc,status);
create index automation_breakers_open_idx on public.automation_circuit_breakers(tenant_id,engine,triggered_at desc) where status<>'resolved';
create index automation_notifications_unread_idx on public.automation_notifications(tenant_id,created_at desc) where read_at is null;

create or replace function public.axis_enforce_r8_tenant_fk() returns trigger language plpgsql set search_path=public as $$
declare d jsonb:=to_jsonb(new);relation_id uuid;relation_name text;
begin
  foreach relation_name in array array['policy_id','recommendation_id','action_id','execution_id'] loop
    relation_id:=nullif(d->>relation_name,'')::uuid;continue when relation_id is null;
    if relation_name='policy_id' and not exists(select 1 from public.automation_policies where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';
    elsif relation_name='recommendation_id' and not exists(select 1 from public.recommendations where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';
    elsif relation_name='action_id' and not exists(select 1 from public.automation_actions where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';
    elsif relation_name='execution_id' and not exists(select 1 from public.automation_executions where id=relation_id and tenant_id=new.tenant_id) then raise exception 'Invalid tenant relationship';end if;
  end loop;
  if tg_table_name='automation_actions' then
    if new.target_type='media_campaign' and not exists(select 1 from public.media_campaigns where id=new.target_id and tenant_id=new.tenant_id) then raise exception 'Invalid cross-tenant automation target';
    elsif new.target_type='buyer' and not exists(select 1 from public.buyers where id=new.target_id and tenant_id=new.tenant_id) then raise exception 'Invalid cross-tenant automation target';
    elsif new.target_type='lead_recovery' and not exists(select 1 from public.lead_recoveries where id=new.target_id and tenant_id=new.tenant_id) then raise exception 'Invalid cross-tenant automation target';
    elsif new.target_type='recommendation' and not exists(select 1 from public.recommendations where id=new.target_id and tenant_id=new.tenant_id) then raise exception 'Invalid cross-tenant automation target';
    elsif new.target_type='experiment' and not exists(select 1 from public.experiments where id=new.target_id and tenant_id=new.tenant_id) then raise exception 'Invalid cross-tenant automation target';
    elsif new.target_type='integration' and not exists(select 1 from public.integrations where id=new.target_id and tenant_id=new.tenant_id) then raise exception 'Invalid cross-tenant automation target';end if;
  end if;
  return new;
end $$;

create or replace function public.axis_create_default_automation_settings() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.automation_settings(tenant_id,default_mode,execution_mode) values(new.id,'advisory','simulated') on conflict(tenant_id) do nothing;return new;end $$;
create trigger tenant_default_automation_settings after insert on public.tenants for each row execute function public.axis_create_default_automation_settings();

do $$ declare table_name text;begin
  foreach table_name in array array['automation_settings','automation_policies','automation_actions','automation_approvals','automation_executions','automation_rollbacks','automation_circuit_breakers','automation_notifications'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('create policy %I_read on public.%I for select to authenticated using(public.axis_is_tenant_member(tenant_id))',table_name,table_name);
    execute format('create trigger r8_%I_tenant_fk before insert or update on public.%I for each row execute function public.axis_enforce_r8_tenant_fk()',table_name,table_name);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.axis_capture_audit_event()',table_name,table_name);
  end loop;
  foreach table_name in array array['automation_settings','automation_policies'] loop
    execute format('create policy %I_manage on public.%I for all to authenticated using(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array[''tenant_admin'']::public.axis_role[]))',table_name,table_name);
    execute format('create trigger r8_%I_updated before update on public.%I for each row execute function public.axis_set_updated_at()',table_name,table_name);
  end loop;
end $$;
create policy automation_actions_create on public.automation_actions for insert to authenticated with check(requested_by=auth.uid() and (public.axis_is_platform_admin() or public.axis_has_direct_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]) or (engine='acquire' and public.axis_has_direct_tenant_role(tenant_id,array['media_buyer']::public.axis_role[]))));
create policy automation_breakers_manage on public.automation_circuit_breakers for update to authenticated using(public.axis_has_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[])) with check(public.axis_has_tenant_role(tenant_id,array['tenant_admin','manager']::public.axis_role[]));
create policy automation_notifications_mark_read on public.automation_notifications for update to authenticated using(public.axis_is_tenant_member(tenant_id)) with check(public.axis_is_tenant_member(tenant_id));
alter table public.platform_automation_controls enable row level security;
create policy platform_automation_controls_admin on public.platform_automation_controls for all to authenticated using(public.axis_is_platform_admin()) with check(public.axis_is_platform_admin());
create trigger audit_platform_automation_controls after insert or update or delete on public.platform_automation_controls for each row execute function public.axis_capture_audit_event();

grant select on public.automation_settings,public.automation_policies,public.automation_actions,public.automation_approvals,public.automation_executions,public.automation_rollbacks,public.automation_circuit_breakers,public.automation_notifications to authenticated;
grant insert,update,delete on public.automation_settings,public.automation_policies to authenticated;
grant insert on public.automation_actions to authenticated;
grant update on public.automation_circuit_breakers,public.automation_notifications to authenticated;
grant select,insert,update,delete on public.platform_automation_controls to authenticated;

create or replace function public.axis_decide_automation_action(p_tenant_id uuid,p_action_id uuid,p_decision text,p_safe_note text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare action_row public.automation_actions%rowtype;approval_total integer;allowed boolean;
begin
  if p_decision not in ('approved','rejected') or length(p_safe_note)>500 then raise exception 'Invalid automation decision';end if;
  select * into action_row from public.automation_actions where id=p_action_id and tenant_id=p_tenant_id for update;if not found then raise exception 'Automation action not found';end if;
  allowed:=public.axis_is_platform_admin() or public.axis_has_direct_tenant_role(p_tenant_id,array['tenant_admin','manager']::public.axis_role[]) or (action_row.engine='acquire' and public.axis_has_direct_tenant_role(p_tenant_id,array['media_buyer']::public.axis_role[]));
  if not allowed then raise insufficient_privilege using message='Automation approval requires an authorized capability';end if;
  if action_row.status not in ('draft','awaiting_approval','approved') then raise exception 'Automation action is not awaiting a decision';end if;
  insert into public.automation_approvals(tenant_id,action_id,decision,decided_by,safe_note) values(p_tenant_id,p_action_id,p_decision,auth.uid(),p_safe_note) on conflict(action_id,decided_by) do update set decision=excluded.decision,safe_note=excluded.safe_note,decided_at=now();
  if p_decision='rejected' then update public.automation_actions set status='cancelled',completed_at=now(),failure_code='OPERATOR_REJECTED',failure_message='Action rejected by an authorized operator.' where id=p_action_id;
  else
    select count(*) into approval_total from public.automation_approvals where action_id=p_action_id and decision='approved';
    update public.automation_actions set approval_count=approval_total,status=case when approval_total>=required_approvals then 'approved' else 'awaiting_approval' end,approved_by=case when approval_total>=required_approvals then auth.uid() else approved_by end,approved_at=case when approval_total>=required_approvals then now() else approved_at end where id=p_action_id;
  end if;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(p_tenant_id,auth.uid(),'automation.action_'||p_decision,'automation_actions',p_action_id,jsonb_build_object('decision',p_decision));
  return jsonb_build_object('id',p_action_id,'decision',p_decision,'approvalCount',coalesce(approval_total,0));
end $$;

create or replace function public.axis_simulate_automation_action(p_tenant_id uuid,p_action_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare action_row public.automation_actions%rowtype;settings_row public.automation_settings%rowtype;execution_row public.automation_executions%rowtype;allowed boolean;block_code text;block_message text;
begin
  select * into action_row from public.automation_actions where id=p_action_id and tenant_id=p_tenant_id for update;if not found then raise exception 'Automation action not found';end if;
  allowed:=public.axis_is_platform_admin() or public.axis_has_direct_tenant_role(p_tenant_id,array['tenant_admin','manager']::public.axis_role[]) or (action_row.engine='acquire' and public.axis_has_direct_tenant_role(p_tenant_id,array['media_buyer']::public.axis_role[]));
  if not allowed then raise insufficient_privilege;end if;
  select * into settings_row from public.automation_settings where tenant_id=p_tenant_id;
  if action_row.status='succeeded' then select * into execution_row from public.automation_executions where action_id=p_action_id and tenant_id=p_tenant_id order by started_at desc limit 1;return jsonb_build_object('id',execution_row.id,'status',execution_row.status,'idempotent',true,'mode',execution_row.execution_mode);end if;
  if action_row.status<>'approved' then raise exception 'Action must be approved before execution';end if;
  if settings_row.kill_switch_enabled then block_code:='TENANT_KILL_SWITCH';block_message:='Tenant automation is paused.';
  elsif settings_row.execution_mode<>'simulated' then block_code:='TRUSTED_ADAPTER_REQUIRED';block_message:='Live execution requires a trusted server adapter.';
  elsif exists(select 1 from public.platform_automation_controls where suspended and (control_key='all_outbound' or (control_key='media_mutations' and action_row.engine='acquire') or (control_key='automated_recovery' and action_row.engine='recover'))) then block_code:='PLATFORM_SUSPENSION';block_message:='Platform execution is suspended.';
  elsif exists(select 1 from public.automation_circuit_breakers where tenant_id=p_tenant_id and engine=action_row.engine and status<>'resolved' and (action_type is null or action_type=action_row.action_type)) then block_code:='CIRCUIT_BREAKER';block_message:='Automation circuit breaker is open.';end if;
  if block_code is not null then
    update public.automation_actions set status='blocked',failure_code=block_code,failure_message=block_message,completed_at=now() where id=p_action_id;
    insert into public.automation_executions(tenant_id,action_id,execution_mode,status,idempotency_key,previous_state,requested_state,connector_status,safe_error_code,rollback_available,completed_at) values(p_tenant_id,p_action_id,'simulated','blocked',action_row.idempotency_key||':blocked',action_row.previous_state,action_row.proposed_state,'NOT_EXECUTED',block_code,false,now()) on conflict(tenant_id,idempotency_key) do nothing;
    insert into public.automation_notifications(tenant_id,type,severity,title,safe_message,action_id) values(p_tenant_id,case when block_code='CIRCUIT_BREAKER' then 'circuit_breaker' else 'automation_paused' end,'warning','Automation action blocked',block_message,p_action_id);
    insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(p_tenant_id,auth.uid(),'automation.action_blocked','automation_actions',p_action_id,jsonb_build_object('code',block_code));
    return jsonb_build_object('id',p_action_id,'status','blocked','code',block_code,'idempotent',false,'mode','simulated');
  end if;
  update public.automation_actions set status='executing',executed_by=auth.uid(),executed_at=now() where id=p_action_id;
  insert into public.automation_executions(tenant_id,action_id,execution_mode,status,idempotency_key,previous_state,requested_state,connector_status,rollback_available,completed_at) values(p_tenant_id,p_action_id,'simulated','succeeded',action_row.idempotency_key,action_row.previous_state,action_row.proposed_state,'SIMULATED_SUCCESS',action_row.rollback_status='available',now()) returning * into execution_row;
  update public.automation_actions set status='succeeded',completed_at=now() where id=p_action_id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(p_tenant_id,auth.uid(),'automation.action_executed','automation_actions',p_action_id,jsonb_build_object('mode','simulated','result','succeeded'));
  return jsonb_build_object('id',execution_row.id,'status','succeeded','idempotent',false,'mode','simulated');
end $$;

create or replace function public.axis_request_automation_rollback(p_tenant_id uuid,p_action_id uuid,p_safe_reason text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare action_row public.automation_actions%rowtype;execution_row public.automation_executions%rowtype;rollback_id uuid;
begin
  if not public.axis_has_direct_tenant_role(p_tenant_id,array['tenant_admin','manager']::public.axis_role[]) then raise insufficient_privilege;end if;
  if length(p_safe_reason)>500 then raise exception 'Rollback reason is too long';end if;
  select * into action_row from public.automation_actions where id=p_action_id and tenant_id=p_tenant_id for update;
  if not found or action_row.status<>'succeeded' or action_row.rollback_status<>'available' then raise exception 'Rollback is not available';end if;
  select * into execution_row from public.automation_executions where action_id=p_action_id and tenant_id=p_tenant_id and status='succeeded' order by started_at desc limit 1;
  insert into public.automation_rollbacks(tenant_id,action_id,execution_id,status,restore_state,safe_reason,requested_by,completed_at) values(p_tenant_id,p_action_id,execution_row.id,'succeeded',action_row.previous_state,p_safe_reason,auth.uid(),now()) returning id into rollback_id;
  update public.automation_actions set status='rolled_back',rollback_status='succeeded',completed_at=now() where id=p_action_id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata) values(p_tenant_id,auth.uid(),'automation.rollback_completed','automation_actions',p_action_id,jsonb_build_object('mode','simulated','result','succeeded'));
  return jsonb_build_object('id',rollback_id,'status','succeeded','mode','simulated');
end $$;

create or replace function public.axis_set_automation_kill_switch(p_tenant_id uuid,p_enabled boolean,p_safe_reason text default '') returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.axis_has_direct_tenant_role(p_tenant_id,array['tenant_admin']::public.axis_role[]) then raise insufficient_privilege;end if;
  if length(p_safe_reason)>500 then raise exception 'Reason is too long';end if;
  update public.automation_settings set kill_switch_enabled=p_enabled where tenant_id=p_tenant_id;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata) select p_tenant_id,auth.uid(),case when p_enabled then 'automation.kill_switch_enabled' else 'automation.kill_switch_disabled' end,'automation_settings',id,jsonb_build_object('enabled',p_enabled) from public.automation_settings where tenant_id=p_tenant_id;
end $$;

create or replace function public.axis_set_platform_automation_control(p_control_key text,p_suspended boolean,p_safe_reason text default '') returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.axis_is_platform_admin() then raise insufficient_privilege;end if;
  if p_control_key not in ('all_outbound','media_mutations','automated_recovery') or length(p_safe_reason)>500 then raise exception 'Invalid platform automation control';end if;
  update public.platform_automation_controls set suspended=p_suspended,safe_reason=p_safe_reason,updated_by=auth.uid(),updated_at=now() where control_key=p_control_key;
  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,metadata) values(null,auth.uid(),'automation.platform_suspension_changed','platform_automation_controls',jsonb_build_object('control',p_control_key,'suspended',p_suspended));
end $$;

revoke all on function public.axis_automation_json_is_safe(jsonb),public.axis_decide_automation_action(uuid,uuid,text,text),public.axis_simulate_automation_action(uuid,uuid),public.axis_request_automation_rollback(uuid,uuid,text),public.axis_set_automation_kill_switch(uuid,boolean,text),public.axis_set_platform_automation_control(text,boolean,text) from public;
grant execute on function public.axis_decide_automation_action(uuid,uuid,text,text),public.axis_simulate_automation_action(uuid,uuid),public.axis_request_automation_rollback(uuid,uuid,text),public.axis_set_automation_kill_switch(uuid,boolean,text),public.axis_set_platform_automation_control(text,boolean,text) to authenticated;

comment on table public.automation_actions is 'Tenant-scoped, PII-free executable intent. Outcomes are preserved and connector credentials are never stored.';
comment on table public.automation_executions is 'Append-only safe execution history; raw connector responses are prohibited.';
comment on function public.axis_simulate_automation_action(uuid,uuid) is 'Staging-only simulated execution. Live mutations require a separately deployed trusted server adapter.';
