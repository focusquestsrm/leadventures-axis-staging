# Optimization model

Axis Optimize compares operational volume with trusted spend, outcome revenue, recovery revenue, delivery cost, buyer caps, and integration freshness. Tenant snapshots supply portfolio totals; dimension snapshots supply buyer, program, campaign, and recovery comparisons without being added into tenant totals.

## Guardrails

- All recommendation rules are deterministic and explainable.
- No browser path executes media, routing, cap, bid, or budget changes.
- Approval, rejection, dismissal, and implementation are explicit human decisions.
- Implementation can be recorded only after approval.
- Recommendation evidence contains aggregate operational facts, never identity fields.
- Missing values are preserved as unavailable.

The default provider is `DeterministicRecommendationProvider`. `FutureAIRecommendationProvider` is an inactive boundary only. Any future provider must receive the sanitized aggregate context, pass the PII-key guard, and return structured evidence subject to the same human approval workflow.

## Pacing

Pacing uses the configured cap, delivered count, elapsed days, and remaining period. It reports current daily pace, required daily pace, projected period delivery, and projected cap date. States are inactive, period ended, under pace, on pace, over pace, and projected early cap.

## Data freshness

Connected integrations are fresh through six hours, delayed through 24 hours, and stale afterward. Missing integration success timestamps produce unknown freshness. Delayed, stale, and unknown data visibly reduces decision confidence.
