import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, StrictMode } from "react";
import { createQueryClient } from "../shared/api/create-query-client";
import type { FrontendPlatformConfig } from "../shared/config/platform";
import { FrontendAppShell } from "./frontend-app-shell";
import "./styles/index.scss";

export function createFrontendApp(platform: FrontendPlatformConfig) {
  const queryClient = createQueryClient();

  return createElement(
    StrictMode,
    null,
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(FrontendAppShell, {
        platform
      })
    )
  );
}
