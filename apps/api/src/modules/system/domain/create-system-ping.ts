import type { SystemPingInput, SystemPingResponse } from "../contract/index.js";

export function createSystemPing(
  input: SystemPingInput
): SystemPingResponse {
  return {
    message: "Foundation is ready.",
    platform: input.platform,
    template: "product-foundation-starter"
  };
}
