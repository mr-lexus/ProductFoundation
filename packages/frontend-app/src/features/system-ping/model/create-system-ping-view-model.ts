import {
  createSystemStatusModel,
  type SystemStatusModel
} from "../../../entities/system";
import type {
  SystemPingResponse,
  RpcCallResult
} from "@app/contracts";

export function createSystemPingViewModel(
  result: RpcCallResult<SystemPingResponse>,
  apiBaseUrl: string
): SystemStatusModel {
  return createSystemStatusModel(result, apiBaseUrl);
}
