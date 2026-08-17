# Release 7: Acquire

Release 7 connects aggregate media activity to Axis leads, delivery, recovery, outcomes, revenue, contribution, and buyer capacity. It supports Meta Ads, Google Ads, and TikTok Ads through a shared canonical connector interface and adds an idempotent CSV fallback based on the Release 4 import architecture.

## Delivered scope

- Tenant-scoped media accounts, campaigns, ad groups, ads, creatives, daily metrics, sync runs, landing pages, attribution touches, experiments, and variants.
- Acquisition dashboard and source, campaign, ad-group, and creative scorecards.
- Transparent last-known-acquisition-touch attribution.
- Platform conversion metrics kept separate from Axis downstream outcomes.
- Creative fatigue thresholds, experiment minimum samples, buyer-capacity context, recovery economics, and acquisition recommendations.
- Convert and Optimize connections without autonomous ad buying.

## Operational boundary

No Release 7 code changes budgets, bids, targeting, creative status, routing, or delivery. Production OAuth/token exchange requires a trusted server or Edge Function plus an external secrets manager. The browser receives account status and secret references only, never credential values.

Apply `202608160010_release_7_acquire.sql` to staging, then execute `supabase/tests/release_7_security.sql` in a disposable authenticated database test environment.
