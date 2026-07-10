import type { RpcProcedureContract } from "@gtd-planner/contracts";

interface RpcClientConfig {
  apiBaseUrl: string;
}

function normalizeApiBaseUrl(apiBaseUrl: string) {
  return apiBaseUrl.replace(/\/$/, "");
}

export async function callRpcProcedure<TInput, TOutput>(
  config: RpcClientConfig,
  contract: RpcProcedureContract<TInput, TOutput>,
  input: TInput
): Promise<TOutput> {
  const validatedInput = contract.inputSchema.parse(input);
  const response = await fetch(
    `${normalizeApiBaseUrl(config.apiBaseUrl)}${contract.path}`,
    {
      body: JSON.stringify(validatedInput),
      headers: {
        "content-type": "application/json"
      },
      method: contract.method
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Backend request failed with status ${response.status}`;

    throw new Error(message);
  }

  return contract.outputSchema.parse(payload);
}
