import type { FrontendPlatformConfig } from "@app/frontend-app";

export function createWebPlatformConfig(): FrontendPlatformConfig {
  return {
    apiBaseUrl:
      import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : ""),
    platform: "web",
    title: "Product Starter — Web"
  };
}
