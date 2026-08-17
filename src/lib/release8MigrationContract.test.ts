import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(new URL('../../supabase/migrations/202608160011_release_8_orchestration.sql', import.meta.url), 'utf8').toLowerCase()

describe('Release 8 orchestration migration contract', () => {
  it('creates every orchestration entity', () => { for (const table of ['automation_settings', 'automation_policies', 'automation_actions', 'automation_approvals', 'automation_executions', 'automation_rollbacks', 'automation_circuit_breakers', 'automation_notifications', 'platform_automation_controls']) expect(sql).toContain(`create table public.${table}`) })
  it('defaults tenants to conservative automation', () => { expect(sql).toContain("default_mode text not null default 'advisory'"); expect(sql).toContain("values(new.id,'advisory','simulated')") })
  it('defines the complete action and status models', () => { for (const status of ['awaiting_approval', 'partially_succeeded', 'rolled_back', 'expired', 'blocked']) expect(sql).toContain(`'${status}'`); for (const action of ['increase_budget', 'shift_buyer_allocation', 'execute_recovery_path', 'execute_recommendation', 'activate_experiment_variant', 'retry_sync']) expect(sql).toContain(`'${action}'`) })
  it('enforces idempotency and safe metadata', () => { expect(sql).toContain('unique(tenant_id,idempotency_key)'); expect(sql).toContain('axis_automation_json_is_safe'); for (const prohibited of ['password', 'secret', 'token', 'jwt', 'authorization', 'credential', 'api_?key']) expect(sql).toContain(prohibited) })
  it('adds queue, target, history, breaker, and notification indexes', () => { for (const index of ['automation_actions_queue_idx', 'automation_actions_target_idx', 'automation_executions_history_idx', 'automation_breakers_open_idx', 'automation_notifications_unread_idx']) expect(sql).toContain(index) })
  it('enables RLS and tenant-scoped reads', () => { expect(sql).toContain("array['automation_settings','automation_policies','automation_actions','automation_approvals','automation_executions','automation_rollbacks','automation_circuit_breakers','automation_notifications']"); expect(sql).toContain('axis_is_tenant_member(tenant_id)') })
  it('guards relational and polymorphic targets by tenant', () => { for (const target of ['media_campaigns', 'buyers', 'lead_recoveries', 'recommendations', 'experiments', 'integrations']) expect(sql).toContain(`from public.${target} where id=new.target_id and tenant_id=new.tenant_id`) })
  it('keeps approvals, execution, rollback, and switches behind functions', () => { for (const fn of ['axis_decide_automation_action', 'axis_simulate_automation_action', 'axis_request_automation_rollback', 'axis_set_automation_kill_switch', 'axis_set_platform_automation_control']) expect(sql).toContain(`function public.${fn}`) })
  it('limits media buyer execution to Acquire', () => { expect(sql).toContain("action_row.engine='acquire'"); expect(sql).toContain("engine='acquire' and public.axis_has_direct_tenant_role") })
  it('restores the exact direct tenant role helper before Release 8 policies use it', () => {
    const helper = 'create or replace function public.axis_has_direct_tenant_role(requested_tenant uuid, allowed_roles public.axis_role[])'
    expect(sql).toContain(helper)
    expect(sql.indexOf(helper)).toBeLessThan(sql.indexOf('create policy automation_actions_create'))
    expect(sql).toContain('grant execute on function public.axis_has_direct_tenant_role(uuid,public.axis_role[]) to authenticated')
  })
  it('preserves append-only execution outcomes', () => { expect(sql).not.toContain('grant update on public.automation_executions'); expect(sql).not.toContain('grant delete on public.automation_executions') })
  it('records semantic automation audit events', () => { expect(sql).toContain("'automation.action_'||p_decision"); for (const event of ['automation.action_executed', 'automation.action_blocked', 'automation.rollback_completed', 'automation.kill_switch_enabled', 'automation.platform_suspension_changed']) expect(sql).toContain(event) })
  it('keeps live mutation outside the browser', () => { expect(sql).toContain('live execution requires a trusted server adapter'); expect(sql).toContain('staging-only simulated execution') })
})
