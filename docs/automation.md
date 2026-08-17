# Automation

Axis implements bounded autonomy through four tenant and policy modes:

- `advisory`: recommendations may be shown; execution is prohibited.
- `approval_required`: an authorized operator must approve before execution.
- `bounded_auto`: configured action types may execute only after every gate and limit passes.
- `disabled`: action execution is blocked.

New tenants default to Advisory and simulated execution. Policies are scoped by tenant, engine, action type, priority, status, conditions, limits, approval requirements, cooldown, and rate window.

Canonical action families cover controlled campaign status/budget changes, eligible routing allocation changes, approved recovery paths, recommendation execution, limited experiment state changes, and integration sync recovery. Unsupported external mutations are not represented as complete capabilities.

The tenant kill switch blocks new execution while preserving recommendations, queued actions, approvals, results, and audit history.
