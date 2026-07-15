import type { RpcCallResult, SystemPingResponse } from "@app/contracts";
import { createSystemStatusModel, type SystemStatusModel } from "../../../entities/system";

export function createSystemPingViewModel(
  result: RpcCallResult<SystemPingResponse>,
  apiBaseUrl: string
): SystemStatusModel {
  return createSystemStatusModel(result, apiBaseUrl);
}
