import type { SystemPingInput, SystemPingResponse } from "../contract/index.js";
import { pingSystem } from "../application/ping-system.js";
import type { RpcHandler } from "@product-foundation/rpc-server";

export type SystemPingRpcHandler = RpcHandler<SystemPingInput, SystemPingResponse>;

export function createSystemPingRpcHandler(): SystemPingRpcHandler {
  return async (input) => pingSystem(input);
}
