import type { OutboxMessageHandler, SqlExecutor } from "@product-foundation/backend-core";

export function createReferenceDurableProbeOutboxHandler(sql: SqlExecutor): OutboxMessageHandler {
  return {
    async handle(message) {
      if (message.schemaVersion !== 1) {
        throw new Error("UnsupportedReferenceDurableProbeEventVersion");
      }
      const result = await sql.query(
        `UPDATE app.reference_durable_probes
         SET delivered_at = COALESCE(delivered_at, now())
         WHERE id = $1`,
        [message.aggregateId]
      );
      if (result.rowCount !== 1) {
        throw new Error("ReferenceDurableProbeNotFound");
      }
    }
  };
}
