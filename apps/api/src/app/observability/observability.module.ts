import { Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";

@Module({
  controllers: [MetricsController],
  exports: [MetricsService],
  providers: [MetricsService]
})
export class ObservabilityModule {}
