import {
  type DynamicModule,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown
} from "@nestjs/common";
import type { SqlExecutor, TransactionRunner } from "@product-foundation/backend-core";
import {
  assertTenantRuntimeRoleSafe,
  PostgresDatabase,
  PostgresIdempotencyStore,
  PostgresOutboxStore,
  PostgresTenantTransactionRunner
} from "@product-foundation/backend-postgres";
import {
  DATABASE_HEALTH,
  IDEMPOTENCY_STORE,
  OUTBOX_STORE,
  SQL_EXECUTOR,
  TENANT_TRANSACTION_RUNNER,
  TRANSACTION_RUNNER
} from "../../shared/application/database.tokens.js";
import type { DatabaseRuntimeConfig } from "../config/load-api-config.js";

const POSTGRES_DATABASE = Symbol("POSTGRES_DATABASE");
const TENANT_RUNTIME_ROLE_SAFETY = Symbol("TENANT_RUNTIME_ROLE_SAFETY");

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(POSTGRES_DATABASE)
    private readonly database: PostgresDatabase
  ) {}

  async onApplicationShutdown() {
    await this.database.close();
  }
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic modules are class-based.
export class DatabaseModule {
  static register(
    config: DatabaseRuntimeConfig,
    dataScopeMode: "global" | "tenant"
  ): DynamicModule {
    return {
      exports: [
        DATABASE_HEALTH,
        IDEMPOTENCY_STORE,
        OUTBOX_STORE,
        ...(dataScopeMode === "tenant"
          ? [TENANT_TRANSACTION_RUNNER]
          : [SQL_EXECUTOR, TRANSACTION_RUNNER])
      ],
      global: true,
      module: DatabaseModule,
      providers: [
        {
          provide: POSTGRES_DATABASE,
          useFactory: () =>
            new PostgresDatabase({
              connectionTimeoutMs: config.connectionTimeoutMs,
              maxConnections: config.maxConnections,
              onUnexpectedPoolError: (error) => {
                process.stderr.write(
                  `${JSON.stringify({
                    errorName: error.name,
                    event: "postgres_pool_error",
                    level: "error"
                  })}\n`
                );
              },
              url: config.url
            })
        },
        {
          provide: DATABASE_HEALTH,
          useExisting: POSTGRES_DATABASE
        },
        {
          provide: SQL_EXECUTOR,
          useExisting: POSTGRES_DATABASE
        },
        {
          provide: TRANSACTION_RUNNER,
          useExisting: POSTGRES_DATABASE
        },
        {
          inject: [TRANSACTION_RUNNER],
          provide: IDEMPOTENCY_STORE,
          useFactory: (transactions: TransactionRunner) =>
            new PostgresIdempotencyStore(transactions)
        },
        {
          inject: [SQL_EXECUTOR, TRANSACTION_RUNNER],
          provide: OUTBOX_STORE,
          useFactory: (sql: SqlExecutor, transactions: TransactionRunner) =>
            new PostgresOutboxStore(sql, transactions)
        },
        {
          inject: [TRANSACTION_RUNNER],
          provide: TENANT_TRANSACTION_RUNNER,
          useFactory: (transactions: PostgresDatabase) =>
            new PostgresTenantTransactionRunner(transactions)
        },
        ...(dataScopeMode === "tenant"
          ? [
              {
                inject: [POSTGRES_DATABASE],
                provide: TENANT_RUNTIME_ROLE_SAFETY,
                useFactory: async (database: PostgresDatabase) => {
                  await assertTenantRuntimeRoleSafe(database);
                  return true;
                }
              }
            ]
          : []),
        DatabaseLifecycle
      ]
    };
  }
}
