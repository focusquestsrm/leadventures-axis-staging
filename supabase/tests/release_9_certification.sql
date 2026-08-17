-- Release 9 schema-level commercial readiness certification.
-- Run after release_1_security.sql through release_8_security.sql on a
-- migration-current staging clone. This script is read-only and stores no PII.
begin;

do $$
declare missing_rls text;
begin
  select string_agg(c.relname,', ' order by c.relname) into missing_rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and exists(
    select 1 from information_schema.columns col where col.table_schema='public' and col.table_name=c.relname and col.column_name='tenant_id'
  ) and not c.relrowsecurity;
  if missing_rls is not null then raise exception 'Tenant tables without RLS: %',missing_rls;end if;
end $$;

do $$ begin
  if exists(
    select 1 from information_schema.role_table_grants
    where table_schema='public' and lower(grantee) in ('anon','public') and privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
  ) then raise exception 'Anonymous/public table access exists';end if;
  if exists(
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name='audit_events' and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE')
  ) then raise exception 'Authenticated audit mutation grant exists';end if;
end $$;

do $$ begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and (table_name like 'automation_%' or table_name like 'media_%' or table_name like 'integration_%')
      and column_name in ('email','phone','first_name','last_name','address','access_token','refresh_token','client_secret','api_key','raw_payload')
  ) then raise exception 'PII or credential column exists in operational metadata';end if;
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='automation_settings' and column_name='default_mode' and column_default ilike '%advisory%'
  ) or not exists(
    select 1 from pg_trigger where tgname='tenant_default_automation_settings' and not tgisinternal
  ) then
    raise exception 'Conservative new-tenant automation defaults are missing';
  end if;
end $$;

rollback;
