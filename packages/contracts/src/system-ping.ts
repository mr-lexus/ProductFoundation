import { z } from "zod";
import { defineRpcProcedure } from "@product-foundation/rpc";

export const clientPlatformSchema = z.enum(["web", "mobile", "desktop"]);

export type ClientPlatform = z.infer<typeof clientPlatformSchema>;

export const systemPingInputSchema = z.object({
  platform: clientPlatformSchema
});

export type SystemPingInput = z.infer<typeof systemPingInputSchema>;

export const systemPingResponseSchema = z.object({
  message: z.string(),
  platform: clientPlatformSchema,
  template: z.literal("product-foundation-starter")
});

export type SystemPingResponse = z.infer<typeof systemPingResponseSchema>;

export const systemPingRpcContract = defineRpcProcedure({
  id: "system.ping",
  inputSchema: systemPingInputSchema,
  kind: "query",
  method: "POST",
  outputSchema: systemPingResponseSchema,
  path: "/rpc/v1/system-ping"
});
