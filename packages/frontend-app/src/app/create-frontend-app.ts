import { StrictMode, createElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { FrontendAppShell } from "./frontend-app-shell";
import { createQueryClient } from "../shared/api/create-query-client";
import type { FrontendPlatformConfig } from "../shared/config/platform";
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
