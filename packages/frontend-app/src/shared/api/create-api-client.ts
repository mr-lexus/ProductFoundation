import { type SystemPingInput, systemPingRpcContract } from "@app/contracts";
import {
  callRpcProcedure,
  type RpcCallOptions,
  type RpcClientConfig
} from "@product-foundation/rpc-client";

export function createApiClient(config: RpcClientConfig & { fetch: typeof fetch }) {
  return {
    pingSystem(input: SystemPingInput, options: RpcCallOptions = {}) {
      return callRpcProcedure(config, systemPingRpcContract, input, options);
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
