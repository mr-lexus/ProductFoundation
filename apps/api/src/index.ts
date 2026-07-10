import { createRpcApp } from "./app/rpc/create-rpc-app";

export * from "./app/http/create-http-app";
export * from "./app/rpc/create-rpc-app";

export async function renderApiHelloWorld() {
  const app = createRpcApp();

  return app.helloWorld({ platform: "web" });
}
