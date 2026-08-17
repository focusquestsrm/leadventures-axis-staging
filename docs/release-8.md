# Release 8 — Automation and Orchestration

Release 8 connects Acquire, Convert, Route, Recover, Optimize, and integration operations through bounded, tenant-scoped automation. It does not grant unrestricted autonomous marketing authority.

The release adds conservative tenant defaults, automation policies, executable action records, individual and four-eyes approvals, execution gates, immutable execution history, simulated connector execution, rollback records, circuit breakers, notifications, tenant kill switches, and platform emergency controls.

Staging execution is explicitly `SIMULATED`. Live connector mutation requires a separately deployed trusted server adapter and server-side credentials. AI and browser code cannot exercise execution authority.

Database migration: `supabase/migrations/202608160011_release_8_orchestration.sql`.

Release completion still requires applying migration 011 to connected staging and passing `supabase/tests/release_8_security.sql` against that database. Commercial Readiness is a separate phase.
