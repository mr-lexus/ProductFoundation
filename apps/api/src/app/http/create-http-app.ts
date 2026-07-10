import { helloWorldRpcContract } from "@gtd-planner/contracts";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRpcApp } from "../rpc/create-rpc-app";

export function createHttpApp() {
  const rpcApp = createRpcApp();
  const app = new Hono();

  app.use("/rpc/*", cors());

  app.get("/health", (context) =>
    context.json({
      service: "api",
      status: "ok"
    })
  );

  app.post(helloWorldRpcContract.path, async (context) => {
    const payload = await context.req.json().catch(() => null);
    const parsedInput = helloWorldRpcContract.inputSchema.safeParse(payload);

    if (!parsedInput.success) {
      return context.json(
        {
          details: parsedInput.error.flatten(),
          error: "invalid_payload"
        },
        400
      );
    }

    const response = await rpcApp.helloWorld(parsedInput.data);
    const validatedResponse = helloWorldRpcContract.outputSchema.parse(response);

    return context.json(validatedResponse);
  });

  return app;
}
