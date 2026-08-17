# Orchestration Architecture

The orchestration sequence is:

```text
Recommendation or deterministic rule
  → Automation policy
  → Authorization and compliance gates
  → Approval when required
  → Trusted execution boundary
  → Vendor-neutral connector adapter
  → Redacted execution record
  → Observational impact measurement
  → Optional rollback
```

React pages only request service operations. `orchestrationService.ts` coordinates tenant-scoped records; `domain.ts` evaluates deterministic gates; `executionService.ts` defines connector mutation and rollback interfaces. The `SandboxConnectorAdapter` is the only implemented mutation adapter and always reports `simulated`.

Acquire actions target media campaigns. Convert targets approved experiment states. Route targets eligible buyers and allocations. Recover targets an existing approved recovery. Optimize preserves recommendation IDs when it creates executable intent. Integration actions target connector synchronization. Target IDs and recommendation IDs preserve the complete explanation chain.

Execution authority never flows directly from an AI provider. AI may recommend, rank, summarize, or forecast; Axis policy, authorization, approval, and trusted execution remain mandatory.
