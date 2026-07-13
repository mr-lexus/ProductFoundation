import type { FrontendPlatformConfig } from "@app/frontend-app";

const DEFAULT_API_URL = "http://localhost:3001";

export function createWebPlatformConfig(): FrontendPlatformConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_API_URL ?? DEFAULT_API_URL,
    platform: "web",
    title: "Product Starter — Web"
  };
}
