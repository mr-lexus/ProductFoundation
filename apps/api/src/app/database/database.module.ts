import {
  Inject,
  Injectable,
  Module,
  type DynamicModule,
  type OnApplicationShutdown
} from "@nestjs/common";
import type { DatabaseRuntimeConfig } from "../config/load-api-config.js";
import {
  PostgresDatabase,
  PostgresTenantTransactionRunner
} from "@product-foundation/backend-postgres";
import {
  DATABASE_HEALTH,
  SQL_EXECUTOR,
  TENANT_TRANSACTION_RUNNER,
  TRANSACTION_RUNNER
} from "./database.tokens.js";

const POSTGRES_DATABASE = Symbol("POSTGRES_DATABASE");

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
export class DatabaseModule {
  static register(config: DatabaseRuntimeConfig): DynamicModule {
    return {
      exports: [
        DATABASE_HEALTH,
        SQL_EXECUTOR,
        TENANT_TRANSACTION_RUNNER,
        TRANSACTION_RUNNER
      ],
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
                    event: "postgres_pool_error",
                    level: "error",
                    message: error.message
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
          provide: TENANT_TRANSACTION_RUNNER,
          useFactory: (transactions: PostgresDatabase) =>
            new PostgresTenantTransactionRunner(transactions)
        },
        DatabaseLifecycle
      ]
    };
  }
}
