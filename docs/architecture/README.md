# Architecture documentation

[Русская версия](./README-RU.md)

Start with the [Developer guide](../../DEVELOPER_GUIDE.md).

- [Target architecture](./target-architecture.md)
- [Monorepo layout](./monorepo-layout.md)
- [Where to put code](./where-to-put-code.md)
- [Foundation and product boundaries](./foundation-boundaries.md)
- [Executable architecture checks](./executable-architecture.md)
- [RPC protocol](./rpc-protocol.md)
- [System ping flow](./system-ping-flow.md)
- [Local development](./local-development.md)
- [Environment variables and runtime origins](./environment-contract.md)
- [Tenant isolation](./tenant-isolation.md)
- [Reference durable flow](./reference-durable-flow.md)
- [Threat model](./threat-model.md)
- [Operations runbook](./operations-runbook.md)
- [Architecture change checklist](./architecture-change-checklist.md)
- [Naming conventions](./naming-conventions.md)
- [Readiness and verification limits](./foundation-readiness.md)
- [Implementation roadmap](./implementation-roadmap.md)
- [Template lifecycle and upgrades](./template-lifecycle.md)
- [Product feedback loop](./product-feedback-loop.md)

Lasting decisions and their rationale are in the [ADR index](../adr/README.md).
If documentation conflicts with development rules, the nearest `AGENTS.md` applies.
All rule files are linked from the [documentation index](../README.md).

Frontend decisions: [independent shells](../adr/0011-frontend-runtime-composition.md)
and [Web-only PWA](../adr/0012-web-only-pwa.md).
