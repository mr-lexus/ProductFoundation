import {
  helloWorldRpcContract,
  type HelloWorldInput,
  type HelloWorldResponse
} from "@gtd-planner/contracts";
import type { FrontendPlatformConfig } from "../../config/platform";
import { callRpcProcedure } from "../client/call-rpc-procedure";

export async function getHelloWorld(
  platform: FrontendPlatformConfig,
  input: HelloWorldInput
): Promise<HelloWorldResponse> {
  return callRpcProcedure(
    {
      apiBaseUrl: platform.apiBaseUrl
    },
    helloWorldRpcContract,
    input
  );
}
