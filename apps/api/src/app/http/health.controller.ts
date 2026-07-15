import { Controller, Get, Inject, Optional, ServiceUnavailableException } from "@nestjs/common";
import type { DatabaseHealthCheck } from "@product-foundation/backend-core";
import { DATABASE_HEALTH } from "../database/database.tokens.js";

@Controller()
export class HealthController {
  constructor(
    @Optional()
    @Inject(DATABASE_HEALTH)
    private readonly database?: DatabaseHealthCheck
  ) {}

  @Get("/health")
  health() {
    return {
      service: "api",
      status: "ok"
    };
  }

  @Get("/health/live")
  live() {
    return {
      service: "api",
      status: "ok"
    };
  }

  @Get("/health/ready")
  async ready() {
    if (this.database === undefined) {
      return {
        checks: { database: "not_configured" },
        service: "api",
        status: "ready"
      };
    }

    try {
      await this.database.check();
      return {
        checks: { database: "ok" },
        service: "api",
        status: "ready"
      };
    } catch {
      throw new ServiceUnavailableException("Database is unavailable.");
    }
  }
}
