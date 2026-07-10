import type { HelloWorldCardModel } from "../../../entities/hello";

export function createHelloWorldPanel(model: HelloWorldCardModel): string {
  return [
    `# ${model.title}`,
    model.message,
    model.transportMeta,
    `requestId=${model.requestId}`,
    `servedAt=${model.servedAt}`
  ].join("\n");
}
