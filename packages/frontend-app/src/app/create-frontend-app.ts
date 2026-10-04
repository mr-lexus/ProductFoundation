import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, StrictMode } from "react";
import { ApiClientProvider } from "../shared/api/api-client-provider";
import { createApiClient } from "../shared/api/create-api-client";
import { createQueryClient } from "../shared/api/create-query-client";
import type { FrontendPlatformConfig } from "../shared/config/platform";
import { FrontendAppShell } from "./frontend-app-shell";
import "./styles/index.scss";

export function createFrontendApp(
  platform: FrontendPlatformConfig,
  transport: { fetch: typeof fetch }
) {
  const queryClient = createQueryClient();
  const apiClient = createApiClient({ apiBaseUrl: platform.apiBaseUrl, fetch: transport.fetch });

  return createElement(
    StrictMode,
    null,
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        ApiClientProvider,
        { value: apiClient },
        createElement(FrontendAppShell, { platform })
      )
    )
  );
}
