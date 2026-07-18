import type { SystemPingInput, SystemPingResponse } from "../contract/index.js";

export function pingSystem(input: SystemPingInput): SystemPingResponse {
  return {
    message: "Foundation is ready.",
    platform: input.platform,
    status: "ready"
  };
}
