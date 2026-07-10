import type { HelloWorldInput, HelloWorldResponse } from "../contract";

export function createHelloWorldMessage(
  input: HelloWorldInput
): Omit<HelloWorldResponse, "source" | "transport" | "workspace"> {
  return {
    message: `Hello world from the backend to ${input.platform}.`,
    platform: input.platform
  };
}
