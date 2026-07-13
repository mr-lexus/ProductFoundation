import type { SystemPingInput, SystemPingResponse } from "../contract/index.js";
import { createSystemPing } from "../domain/create-system-ping.js";

export function pingSystem(input: SystemPingInput): SystemPingResponse {
  return createSystemPing(input);
}
