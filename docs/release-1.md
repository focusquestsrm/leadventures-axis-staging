# Release 1

## Delivered foundation

- Auth session/sign-in boundary and synthetic local demo mode
- Dynamic tenants, branding, memberships, centralized RBAC, settings, and feature flags
- Responsive Lead Ventures Axis application shell and tenant switcher
- Overview and Acquire/Convert/Route/Recover/Optimize shells
- Leads, buyers, offers/programs, integrations, platform tenants, memberships, and audit views
- Tenant-scoped create/edit workflows for leads, buyers, programs, offers, and integration metadata
- Existing-user membership assignment, role changes, and disable/reactivation workflows
- UUID PostgreSQL schema with timestamps, creator attribution, indexes, RLS, tenant relationship guards, and mutation audits
- Isolated lead identity model and PII-safe UI/audit conventions
- Staging environment template and optional synthetic seed

## Intentionally deferred

- Full media buying and campaign management
- Form/landing page building and conversion automation
- Routing rules, ping-post, pricing, and delivery execution
- Recovery sequencing and communication providers
- AI optimization/model execution
- Complete compliance center and retention automation
- Email invitation delivery, password reset UI, and granular identity masking
- Production observability, deployment pipeline, and disaster recovery exercises

These are future releases and should build on the Release 1 tenant, access, audit, and PII boundaries.
