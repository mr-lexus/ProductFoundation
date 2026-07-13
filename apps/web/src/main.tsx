import ReactDOM from "react-dom/client";
import { createFrontendApp } from "@app/frontend-app";
import { createWebPlatformConfig } from "./index";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element #root was not found.");
}

ReactDOM.createRoot(rootElement).render(
  createFrontendApp(createWebPlatformConfig())
);
