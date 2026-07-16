import { Module } from "@nestjs/common";
import type { OutboxWriter, SqlExecutor } from "@product-foundation/backend-core";
import { OUTBOX_STORE, SQL_EXECUTOR } from "../../../shared/application/database.tokens.js";
import { createReferenceDurableProbeHandler } from "../application/create-reference-durable-probe.js";
import type { ReferenceDurableProbeRepository } from "../application/reference-durable-probe.repository.js";
import { PostgresReferenceDurableProbeRepository } from "../infrastructure/postgres-reference-durable-probe.repository.js";
import { createReferenceDurableProbeStatusRpcHandler } from "./create-reference-durable-probe-status-rpc-handler.js";
import {
  REFERENCE_DURABLE_PROBE_CREATE_HANDLER,
  REFERENCE_DURABLE_PROBE_REPOSITORY,
  REFERENCE_DURABLE_PROBE_STATUS_HANDLER
} from "./reference.tokens.js";
import { ReferenceDurableProbeRpcController } from "./reference-durable-probe-rpc.controller.js";

@Module({
  controllers: [ReferenceDurableProbeRpcController],
  providers: [
    {
      inject: [SQL_EXECUTOR],
      provide: REFERENCE_DURABLE_PROBE_REPOSITORY,
      useFactory: (sql: SqlExecutor) => new PostgresReferenceDurableProbeRepository(sql)
    },
    {
      inject: [REFERENCE_DURABLE_PROBE_REPOSITORY, OUTBOX_STORE],
      provide: REFERENCE_DURABLE_PROBE_CREATE_HANDLER,
      useFactory: (repository: ReferenceDurableProbeRepository, outbox: OutboxWriter) =>
        createReferenceDurableProbeHandler(repository, outbox)
    },
    {
      inject: [REFERENCE_DURABLE_PROBE_REPOSITORY],
      provide: REFERENCE_DURABLE_PROBE_STATUS_HANDLER,
      useFactory: (repository: ReferenceDurableProbeRepository) =>
        createReferenceDurableProbeStatusRpcHandler(repository)
    }
  ]
})
export class ReferenceModule {}
