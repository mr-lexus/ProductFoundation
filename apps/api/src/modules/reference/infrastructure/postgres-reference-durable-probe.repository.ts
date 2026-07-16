import type { SqlExecutor } from "@product-foundation/backend-core";
import type { ReferenceDurableProbeRepository } from "../application/reference-durable-probe.repository.js";
import type {
  ReferenceDurableProbe,
  ReferenceDurableProbeCreateOutput
} from "../contract/index.js";

interface ReferenceDurableProbeRow {
  readonly created_at: Date;
  readonly delivered_at: Date | null;
  readonly id: string;
  readonly value: string;
}

function mapProbe(row: ReferenceDurableProbeRow): ReferenceDurableProbe {
  return {
    createdAt: row.created_at.toISOString(),
    deliveredAt: row.delivered_at?.toISOString() ?? null,
    id: row.id,
    value: row.value
  };
}

export class PostgresReferenceDurableProbeRepository implements ReferenceDurableProbeRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findById(id: string) {
    const result = await this.sql.query<ReferenceDurableProbeRow>(
      `SELECT id, value, created_at, delivered_at
       FROM app.reference_durable_probes
       WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapProbe(row);
  }

  async insert(transaction: SqlExecutor, probe: ReferenceDurableProbeCreateOutput) {
    await transaction.query(
      `INSERT INTO app.reference_durable_probes (id, value, created_at)
       VALUES ($1, $2, $3)`,
      [probe.id, probe.value, probe.createdAt]
    );
  }
}
