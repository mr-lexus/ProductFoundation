import type { OutboxWriter } from "@product-foundation/backend-core";
import type { IdempotentRpcMutationHandler } from "../../../shared/application/create-idempotent-rpc-handler-invoker.js";
import type {
  ReferenceDurableProbeCreateInput,
  ReferenceDurableProbeCreateOutput
} from "../contract/index.js";
import { createReferenceDurableProbe } from "../domain/create-reference-durable-probe.js";
import type { ReferenceDurableProbeRepository } from "./reference-durable-probe.repository.js";

export const REFERENCE_DURABLE_PROBE_CREATED_EVENT = "reference-durable-probe.created.v1";

export function createReferenceDurableProbeHandler(
  repository: ReferenceDurableProbeRepository,
  outbox: OutboxWriter
): IdempotentRpcMutationHandler<
  ReferenceDurableProbeCreateInput,
  ReferenceDurableProbeCreateOutput
> {
  return async (input, context) => {
    const probe = createReferenceDurableProbe(input, context.receivedAt);
    await repository.insert(context.execution.transaction, probe);
    await outbox.append(context.execution.transaction, {
      aggregateId: probe.id,
      aggregateType: "reference-durable-probe",
      eventType: REFERENCE_DURABLE_PROBE_CREATED_EVENT,
      id: crypto.randomUUID(),
      occurredAt: context.receivedAt,
      payload: probe,
      schemaVersion: 1,
      scope: { kind: "global" }
    });
    return probe;
  };
}
