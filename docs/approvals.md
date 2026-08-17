# Automation Approvals

The Approval Center lists actions individually with target, current and proposed state, reason, evidence, expected impact, risk, freshness, confidence, policy, and rollback availability.

Approval decisions are append-only records. An action stores an approval count and configured required approval count. Higher-risk policies can require two or more distinct authorized approvers. The database uniqueness constraint on action and approver prevents one operator from satisfying a four-eyes rule twice.

Tenant administrators and managers may approve designated actions. Media buyers may approve only Acquire actions. Analysts and viewers are read-only. Rejection cancels the executable action but preserves all evidence and decision history. High-risk bulk approval is intentionally absent.
