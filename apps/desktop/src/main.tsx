import { createFrontendApp } from "@app/frontend-app";
import ReactDOM from "react-dom/client";
import { createDesktopPlatformConfig } from "./runtime";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element #root was not found.");
}

ReactDOM.createRoot(rootElement).render(
  createFrontendApp(createDesktopPlatformConfig(), { fetch: globalThis.fetch.bind(globalThis) })
);
