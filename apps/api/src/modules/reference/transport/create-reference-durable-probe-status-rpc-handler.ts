import { RpcApplicationError, type RpcHandler } from "@product-foundation/rpc-server";
import type { ReferenceDurableProbeRepository } from "../application/reference-durable-probe.repository.js";
import type { ReferenceDurableProbe, ReferenceDurableProbeStatusInput } from "../contract/index.js";

export type ReferenceDurableProbeStatusRpcHandler = RpcHandler<
  ReferenceDurableProbeStatusInput,
  ReferenceDurableProbe
>;

export function createReferenceDurableProbeStatusRpcHandler(
  repository: ReferenceDurableProbeRepository
): ReferenceDurableProbeStatusRpcHandler {
  return async (input) => {
    const probe = await repository.findById(input.id);
    if (probe === null) {
      throw new RpcApplicationError({
        code: "NOT_FOUND",
        message: "Reference durable probe was not found."
      });
    }
    return probe;
  };
}
