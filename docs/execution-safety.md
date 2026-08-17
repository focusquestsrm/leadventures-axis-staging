# Execution Safety

Every execution fails closed unless the tenant, integration, policy, capability, data, confidence, compliance, budget/capacity, rate, cooldown, and idempotency checks pass.

Acquisition policies can limit percentage change, absolute daily change, daily budget, monthly spend, action volume, and target cooldown. Routing additionally requires approved/active buyers, program and geography eligibility, capacity, duplicate and exclusivity clearance, allowed previous attempts, and maximum allocation. Recovery reuses consent, approved path, age, duplicate, manual-review, and maximum-attempt safeguards.

Freshness behavior is configurable as warn, require approval, or block. Low-confidence actions remain advisory; confidence below the configured auto threshold requires approval. Insufficient sample size blocks execution.

Repeated failures, abnormal volume, stale data, reconciliation failures, spend spikes, and outcome deterioration can open a circuit breaker. Open breakers halt the affected engine/action and preserve evidence for review.

Parameters, evidence, state, notifications, and audit metadata exclude PII and credential-shaped keys. Raw connector responses are never persisted.
