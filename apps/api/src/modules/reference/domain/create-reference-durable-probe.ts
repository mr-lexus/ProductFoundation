import type {
  ReferenceDurableProbeCreateInput,
  ReferenceDurableProbeCreateOutput
} from "../contract/index.js";

export function createReferenceDurableProbe(
  input: ReferenceDurableProbeCreateInput,
  createdAt: Date
): ReferenceDurableProbeCreateOutput {
  return {
    createdAt: createdAt.toISOString(),
    id: input.id,
    value: input.value
  };
}
