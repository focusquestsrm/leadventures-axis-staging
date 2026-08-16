-- Repair the generic audit trigger for tables without membership-specific fields.
-- JSONB field access is safe across every table attached to this trigger.
create or replace function public.axis_capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  old_data jsonb := coalesce(to_jsonb(old), '{}'::jsonb);
  new_data jsonb := coalesce(to_jsonb(new), '{}'::jsonb);
  row_data jsonb;
  event_name text;
  event_tenant_id uuid;
  event_entity_id uuid;
begin
  row_data := case when tg_op='DELETE' then old_data else new_data end;
  event_entity_id := nullif(row_data->>'id', '')::uuid;
  event_tenant_id := case
    when tg_table_name='tenants' then event_entity_id
    else nullif(row_data->>'tenant_id', '')::uuid
  end;

  event_name := rtrim(tg_table_name,'s') || '.' || case tg_op
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    else 'deleted'
  end;

  if tg_table_name='tenant_memberships' and tg_op='INSERT' then
    event_name := 'membership.created';
  elsif tg_table_name='tenant_memberships' and tg_op='DELETE' then
    event_name := 'membership.removed';
  elsif tg_table_name='tenant_memberships' and tg_op='UPDATE' and old_data->>'role' is distinct from new_data->>'role' then
    event_name := 'membership.role_changed';
  elsif tg_table_name='tenant_memberships' and tg_op='UPDATE' and old_data->>'status' is distinct from new_data->>'status' then
    event_name := case when new_data->>'status'='disabled' then 'membership.deactivated' else 'membership.reactivated' end;
  end if;

  insert into public.audit_events(tenant_id,actor_user_id,event_type,entity_type,entity_id,metadata)
  values(event_tenant_id,auth.uid(),event_name,tg_table_name,event_entity_id,jsonb_build_object('operation',lower(tg_op)));

  if tg_op='DELETE' then return old; end if;
  return new;
end
$$;
