import type { OutboxMessageHandler } from "@product-foundation/backend-core";

export function createOutboxHandlers(): ReadonlyMap<string, OutboxMessageHandler> {
  return new Map();
}
