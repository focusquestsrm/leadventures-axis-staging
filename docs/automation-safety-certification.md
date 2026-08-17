# Automation Safety Certification

New tenants default to `advisory` and `simulated`; unrestricted automation is never the default. Certification covers advisory, approval-required, bounded-auto and disabled modes; policy/action compatibility; individual/four-eyes approvals; freshness, confidence and sample gates; budget/routing/recovery limits; cooldown/rate limits; tenant kill switch; platform suspension; circuit breakers; idempotency; and rollback.

Before production setup, run simulated actions for every engine, reject stale/low-confidence evidence, exercise every emergency control, replay idempotency keys, force connector failures until a circuit opens, and complete a rollback drill. Live connector mutation remains blocked until a separately deployed trusted server adapter revalidates all gates with server-side credentials.
