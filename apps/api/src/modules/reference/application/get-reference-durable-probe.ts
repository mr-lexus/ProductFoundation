import type { ReferenceDurableProbeStatusInput } from "../contract/index.js";
import type { ReferenceDurableProbeRepository } from "./reference-durable-probe.repository.js";

export function createGetReferenceDurableProbe(repository: ReferenceDurableProbeRepository) {
  return async (input: ReferenceDurableProbeStatusInput) => repository.findById(input.id);
}
