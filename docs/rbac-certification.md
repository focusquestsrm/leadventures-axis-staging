# RBAC Certification

| Role | Intended boundary |
|---|---|
| `platform_admin` | Platform/tenant operations; no implicit tenant PII capability |
| `tenant_admin` | Tenant configuration, members, integrations, policy and automation controls; cannot assign platform admin |
| `manager` | Tenant operations and governed approvals; no platform functions or membership escalation |
| `media_buyer` | Acquisition operations and Acquire-only automation execution; no recovery approval or platform functions |
| `analyst` | Read and audit analysis; cannot approve or mutate operational controls |
| `viewer` | Read-only operational access |

The frontend matrix is a usability boundary; RLS/policies and security-definer RPC authorization are authoritative. Certification must test each role using a distinct synthetic user, including viewer writes, analyst approvals, media-buyer non-Acquire actions, manager platform calls, tenant-admin platform escalation, and platform-admin identity access without an explicit tenant capability. Preserve results without identity values.

Status: automated matrix passes; repeat against connected staging before production setup.
