import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SystemModule } from "../modules/system/transport/system.module.js";
import type { ApiRuntimeConfig } from "./config/load-api-config.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./http/health.controller.js";
import { RpcHttpExceptionFilter } from "./http/rpc-http-exception.filter.js";
import { ObservabilityModule } from "./observability/observability.module.js";

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic modules are class-based.
export class AppModule {
  static register(config: Pick<ApiRuntimeConfig, "database" | "dataScopeMode">): DynamicModule {
    return {
      controllers: [HealthController],
      imports: [
        SystemModule,
        ObservabilityModule,
        ...(config.database === undefined
          ? []
          : [DatabaseModule.register(config.database, config.dataScopeMode)])
      ],
      module: AppModule,
      providers: [
        {
          provide: APP_FILTER,
          useClass: RpcHttpExceptionFilter
        }
      ]
    };
  }
}
