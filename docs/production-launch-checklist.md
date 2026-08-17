# Production Launch Checklist

Production is a separately authorized release. Every item requires a named owner, evidence and approval.

- [ ] Dedicated production Supabase project; reviewed migrations; live RLS suite; backups/PITR; restore drill
- [ ] Dedicated Netlify/deployment site, protected branch/pipeline, immutable rollback artifact and environment separation
- [ ] Production URL and public anon/publishable key only in browser; secrets in server manager; rotation tested
- [ ] Auth URLs, OAuth redirects, session/MFA policy, email templates/provider and abuse/rate limits
- [ ] Domains, DNS ownership, SSL, redirects, security headers and custom-domain model
- [ ] Storage buckets, MIME/size policies, RLS, malware decision, retention and backups
- [ ] Monitoring/error tracking, redaction, alerts, synthetic checks, dashboards, on-call and incident response
- [ ] Trusted integration adapters, real credentials, scopes, webhooks/signatures, idempotency and reconciliation
- [ ] Automation remains advisory/simulated until explicitly certified; emergency controls and rollback drilled
- [ ] Billing provider mode, subscriptions, entitlements, tax, cancellation, dunning and access consequences reviewed
- [ ] Retention/deletion/export/privacy-request process, privacy contact and legal/product approval
- [ ] Support contact, escalation, SLA/SLO/status communications and customer documentation approved
- [ ] Load/performance/concurrency/failure testing completed against representative synthetic volumes
- [ ] Final role-based smoke test: login, overview, engines, records, integrations, administration and readiness
- [ ] Formal go/no-go signed by security, privacy/legal, engineering, operations, product and launch owner
