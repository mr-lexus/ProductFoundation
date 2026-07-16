import type { OutboxMessageHandler, SqlExecutor } from "@product-foundation/backend-core";
import { REFERENCE_DURABLE_PROBE_CREATED_EVENT } from "../../modules/reference/application/create-reference-durable-probe.js";
import { createReferenceDurableProbeOutboxHandler } from "../../modules/reference/infrastructure/create-reference-durable-probe-outbox-handler.js";

export function createOutboxHandlers(sql: SqlExecutor): ReadonlyMap<string, OutboxMessageHandler> {
  return new Map([
    [REFERENCE_DURABLE_PROBE_CREATED_EVENT, createReferenceDurableProbeOutboxHandler(sql)]
  ]);
}
