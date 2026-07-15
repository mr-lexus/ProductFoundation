import type { RpcCallResult, SystemPingResponse } from "@app/contracts";

export interface SystemStatusModel {
  apiBaseUrl: string;
  platform: string;
  requestId: string;
  servedAt: string;
  title: string;
  message: string;
  transportMeta: string;
}

export function createSystemStatusModel(
  result: RpcCallResult<SystemPingResponse>,
  apiBaseUrl: string
): SystemStatusModel {
  return {
    apiBaseUrl,
    platform: result.data.platform,
    title: "Foundation status",
    message: result.data.message,
    requestId: result.meta.requestId,
    servedAt: result.meta.servedAt,
    transportMeta: `${result.data.platform} via versioned RPC`
  };
}
