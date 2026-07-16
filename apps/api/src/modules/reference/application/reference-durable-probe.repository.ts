import type { SqlExecutor } from "@product-foundation/backend-core";
import type {
  ReferenceDurableProbe,
  ReferenceDurableProbeCreateOutput
} from "../contract/index.js";

export interface ReferenceDurableProbeRepository {
  findById(id: string): Promise<ReferenceDurableProbe | null>;
  insert(transaction: SqlExecutor, probe: ReferenceDurableProbeCreateOutput): Promise<void>;
}
