# Media integrations

`src/integrations/media` defines a vendor-neutral connector contract and adapters for Meta Ads, Google Ads, and TikTok Ads. Each adapter normalizes account, campaign, ad-group/ad-set, ad, creative, date, impressions, clicks, spend, platform conversions, reach, and frequency.

Saved `integration_field_mappings` override recognized export aliases. The CSV path reuses Release 4 parsing and follows upload, preview, mapping, validation, import, and reconciliation. Files over 5 MB require trusted background processing; the database RPC accepts at most 1,000 already-normalized rows per request.

Entity/date idempotency keys make metric re-imports safe. External account, campaign, group, ad, and creative IDs have tenant-scoped uniqueness constraints.

Live OAuth is intentionally not faked. A production connector requires server-side authorization-code exchange, encrypted token storage in a secrets manager, scoped refresh, rotation, revocation, webhook verification, and a worker that writes only canonical aggregates through RLS-authorized boundaries.
