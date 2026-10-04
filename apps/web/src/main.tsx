import { createFrontendApp } from "@app/frontend-app";
import ReactDOM from "react-dom/client";
import { PwaUpdatePrompt } from "./pwa/pwa-update-prompt";
import { createWebPlatformConfig } from "./runtime";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element #root was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <>
    {createFrontendApp(createWebPlatformConfig(), { fetch: globalThis.fetch.bind(globalThis) })}
    {import.meta.env.PROD ? <PwaUpdatePrompt /> : null}
  </>
);
