# Automation Rollback

Rollback is available only when the connector and action are reversible. Axis records the previous state before execution and the requested state separately. A rollback request produces an immutable rollback record and never overwrites the original execution outcome.

Supported statuses are requested, executing, succeeded, and failed. The action separately reports available or not available before a request. Irreversible actions never display a rollback promise.

Staging implements deterministic simulated rollback. A production connector must explicitly implement rollback and return a redacted status before Axis can expose live rollback for that action type. Future automatic rollback policies may use deterministic thresholds but must not create uncontrolled cascades.
