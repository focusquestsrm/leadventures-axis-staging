# Release 6: Optimize

Release 6 adds a deterministic optimization copilot for tenant economics, pacing, short-horizon forecasts, anomaly detection, and evidence-backed recommendations. It is advisory: Axis never changes budgets, bids, routing, caps, campaigns, or connector configuration autonomously.

## Scope

- Tenant-level unit economics and expected lead value with explicit unavailable states.
- Buyer-cap pacing, projected period delivery, and projected exhaustion dates.
- Weighted moving-average forecasts for volume, acceptance, rejection, recovery, conversion, and revenue.
- Threshold-based anomalies with baseline, magnitude, sample size, confidence, and safe likely-driver text.
- Prioritized recommendations with evidence, estimated impact, freshness, expiration, and an auditable decision history.
- Daily brief, campaign economics, buyer optimization, program capacity, and recovery opportunity links.
- Tenant-scoped settings, snapshots, forecasts, results, anomalies, recommendations, and actions in migration `202608160009`.

## Validation boundary

Forecasts and recommendations are estimates, not guarantees. Missing cost or revenue remains unavailable rather than becoming zero. Low samples and stale integrations reduce confidence. Connected-mode decisions apply only to persisted recommendations through `axis_decide_recommendation`; locally generated demo recommendations cannot be mistaken for database records.

Apply migration `202608160009_release_6_optimize.sql` to staging, then run `supabase/tests/release_6_security.sql` in a disposable authenticated test environment.
