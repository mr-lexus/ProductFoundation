# ADR 0001: Modular monolith first

[Русская версия](./0001-modular-monolith-RU.md)

- Status: Accepted
- Date: 2026-07-11

## Context

The starter must support unrelated products and large user bases. Teams may include
AI agents. Introducing microservices early increases deployment units, distributed
transactions, contracts and observability work before load boundaries are measured.

## Decision

Deploy the backend as a modular monolith. Organize business code by capability.
Modules communicate through explicit application APIs rather than each other's
tables. A separate worker entrypoint may use the same modules and contracts.

PostgreSQL becomes the source of truth after the persistence ADR. Publish
asynchronous effects through a transactional outbox. Search, notifications and
realtime are projections/consumers, not owners of canonical data.

## Consequences

Benefits:

- atomic transactions for product workflows;
- simple local development and deployment;
- visible, testable boundaries;
- the option to extract a module later for a measured reason.

Costs:

- imports and ownership require discipline;
- heavy workloads need separate queues/read models;
- one database needs tenant-aware indexes and disciplined migrations.

Extract a service only with an owner, an independent scaling or security boundary,
a measured problem and a data ownership plan.
