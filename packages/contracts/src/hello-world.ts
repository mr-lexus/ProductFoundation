import { z } from "zod";
import { defineRpcProcedure } from "./rpc";

export const clientPlatformSchema = z.enum(["web", "mobile", "desktop"]);

export type ClientPlatform = z.infer<typeof clientPlatformSchema>;

export const helloWorldInputSchema = z.object({
  platform: clientPlatformSchema
});

export type HelloWorldInput = z.infer<typeof helloWorldInputSchema>;

export const helloWorldResponseSchema = z.object({
  message: z.string(),
  platform: clientPlatformSchema,
  source: z.literal("api"),
  transport: z.literal("rpc"),
  workspace: z.literal("gtd-planner"),
  requestId: z.string(),
  servedAt: z.string().datetime()
});

export type HelloWorldResponse = z.infer<typeof helloWorldResponseSchema>;

export const helloWorldRpcContract = defineRpcProcedure({
  inputSchema: helloWorldInputSchema,
  method: "POST",
  outputSchema: helloWorldResponseSchema,
  path: "/rpc/hello-world"
});
