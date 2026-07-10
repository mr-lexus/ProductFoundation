export function createRpcMeta() {
  return {
    requestId: crypto.randomUUID(),
    servedAt: new Date().toISOString(),
    source: "api" as const,
    transport: "rpc" as const,
    workspace: "gtd-planner" as const
  };
}
