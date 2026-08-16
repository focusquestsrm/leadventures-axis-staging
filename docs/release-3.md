# Release 3: Intelligence

## Delivered scope

Release 3 turns Release 2 operational records into tenant-scoped decision intelligence. It adds shared filters, formal metrics, previous-period comparisons, funnel and trend views, source/campaign performance, buyer and program scorecards, rejection and recovery intelligence, capacity visibility, and response-time indicators.

The Overview, Acquire, Convert, Route, Recover, and Optimize areas consume one shared intelligence context. Dedicated Buyer Intelligence, Program Intelligence, and Rejection Intelligence routes provide dimension-level analysis, while existing buyer and lead detail routes remain the record-level drill-down destination.

## Deliberate boundaries

Release 3 does not automatically reroute leads, change caps, buy media, or generate AI recommendations. Spend, CPL, gross margin, and similar economics remain unavailable unless authoritative data exists. Median response time is documented but not displayed until the percentile aggregation is added and validated against connected staging volume.

## Filters

Date presets include Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, and Custom. Source, campaign, buyer, program, offer, and lead-status filters persist while navigating because they live above the router in `IntelligenceProvider`. Filter options are taken only from the active tenant's RLS-protected workspace snapshot.

## Database

Migration `202608160005_release_3_intelligence.sql` adds five supporting indexes and the read-only `axis_intelligence_snapshot` RPC. The RPC uses `SECURITY INVOKER`, requires an authenticated active tenant membership or platform authorization, and returns aggregates without querying `lead_identity`.

## Synthetic demonstration data

`release3Demo.ts` generates deterministic, synthetic operational history across two comparable periods. It contains no customer data or identity fields and is enabled only by the existing explicit demo-mode gate.

## Deployment validation

Run lint, typecheck, tests, and build. Apply migration `005` to the staging Supabase project, then validate tenant isolation and the intelligence routes with connected staging data before closing Release 3.
