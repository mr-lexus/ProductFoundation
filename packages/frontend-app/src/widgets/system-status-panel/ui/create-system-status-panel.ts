import type { SystemStatusModel } from "../../../entities/system";

export function createSystemStatusPanel(model: SystemStatusModel): string {
  return [
    `# ${model.title}`,
    model.message,
    model.transportMeta,
    `requestId=${model.requestId}`,
    `servedAt=${model.servedAt}`
  ].join("\n");
}
