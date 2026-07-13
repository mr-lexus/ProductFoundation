import {
  systemPingRpcContract,
  type SystemPingInput,
  type SystemPingResponse,
  type RpcCallResult
} from "@app/contracts";
import type { FrontendPlatformConfig } from "../../config/platform";
import {
  callRpcProcedure,
  type RpcCallOptions
} from "@product-foundation/rpc-client";

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
