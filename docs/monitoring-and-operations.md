# Monitoring and Operations

## Required signals

Monitor application/database/authentication errors, failed imports and syncs, stale integrations, automation failures, open circuit breakers, unusual rejection spikes, unusual spend/volume changes, queue age and rollback failures. Alerts must contain tenant-safe identifiers, operation, safe code and redacted message only.

## Production configuration required

Select an error/telemetry provider; configure client/server environments and release IDs; scrub request headers, URLs, bodies and identity fields; define severity, thresholds and deduplication; route alerts to an owned on-call schedule; set log/audit retention; add synthetic login/read-only checks; document status communication and incident roles. Test alert receipt and redaction before traffic. No monitoring provider is configured by this repository.
