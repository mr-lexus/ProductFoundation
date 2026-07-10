import type { HelloWorldInput, HelloWorldResponse } from "../contract";
import { createHelloWorldMessage } from "../domain/create-hello-world-message";
import { createRpcMeta } from "../../../shared/lib/create-rpc-meta";

export function getHelloWorld(input: HelloWorldInput): HelloWorldResponse {
  return {
    ...createHelloWorldMessage(input),
    ...createRpcMeta()
  };
}
