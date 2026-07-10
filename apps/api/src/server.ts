import { serve } from "@hono/node-server";
import { createHttpApp } from "./app/http/create-http-app";

const DEFAULT_PORT = 3001;
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const app = createHttpApp();

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`GTD Planner API listening on http://127.0.0.1:${info.port}`);
  }
);
