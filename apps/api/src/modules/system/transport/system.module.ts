import { Module } from "@nestjs/common";
import { createSystemPingRpcHandler } from "./create-system-ping-rpc-handler.js";
import { SystemPingRpcController } from "./system-ping-rpc.controller.js";
import { SYSTEM_PING_RPC_HANDLER } from "./system.tokens.js";

@Module({
  controllers: [SystemPingRpcController],
  providers: [
    {
      provide: SYSTEM_PING_RPC_HANDLER,
      useFactory: createSystemPingRpcHandler
    }
  ]
})
export class SystemModule {}
