import {
  createHelloWorldCardModel,
  type HelloWorldCardModel
} from "../../../entities/hello";
import type { HelloWorldResponse } from "@gtd-planner/contracts";

export function createHelloWorldViewModel(
  response: HelloWorldResponse,
  apiBaseUrl: string
) {
  return createHelloWorldCardModel(response, apiBaseUrl);
}
