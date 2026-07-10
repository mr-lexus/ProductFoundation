import { createHelloWorldRpcHandler } from "../../modules/hello/transport/create-hello-world-rpc-handler";

export function createRpcApp() {
  return {
    helloWorld: createHelloWorldRpcHandler()
  };
}
