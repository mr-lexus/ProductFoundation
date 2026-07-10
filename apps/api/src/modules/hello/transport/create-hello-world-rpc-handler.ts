import type { HelloWorldInput, HelloWorldResponse } from "../contract";
import { getHelloWorld } from "../application/get-hello-world";

export type HelloWorldRpcHandler = (
  input: HelloWorldInput
) => Promise<HelloWorldResponse>;

export function createHelloWorldRpcHandler(): HelloWorldRpcHandler {
  return async (input) => getHelloWorld(input);
}
