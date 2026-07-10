import type { HelloWorldResponse } from "@gtd-planner/contracts";

export interface HelloWorldCardModel {
  apiBaseUrl: string;
  platform: string;
  requestId: string;
  servedAt: string;
  title: string;
  message: string;
  transportMeta: string;
}

export function createHelloWorldCardModel(
  response: HelloWorldResponse,
  apiBaseUrl: string
): HelloWorldCardModel {
  return {
    apiBaseUrl,
    platform: response.platform,
    title: "Hello World",
    message: response.message,
    requestId: response.requestId,
    servedAt: response.servedAt,
    transportMeta: `${response.platform} via ${response.transport} from ${response.source}`
  };
}
