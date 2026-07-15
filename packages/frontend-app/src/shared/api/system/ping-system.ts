import {
  type RpcCallResult,
  type SystemPingInput,
  type SystemPingResponse,
  systemPingRpcContract
} from "@app/contracts";
import { callRpcProcedure, type RpcCallOptions } from "@product-foundation/rpc-client";
import type { FrontendPlatformConfig } from "../../config/platform";

export async function pingSystem(
  platform: FrontendPlatformConfig,
  input: SystemPingInput,
  options: RpcCallOptions = {}
): Promise<RpcCallResult<SystemPingResponse>> {
  return callRpcProcedure(
    {
      apiBaseUrl: platform.apiBaseUrl
    },
    systemPingRpcContract,
    input,
    options
  );
}
