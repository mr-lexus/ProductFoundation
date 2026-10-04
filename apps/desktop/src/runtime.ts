import type { FrontendPlatformConfig } from "@app/frontend-app";

export function createDesktopPlatformConfig(): FrontendPlatformConfig {
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  if (!apiBaseUrl) throw new Error("VITE_API_URL is required for native frontend builds.");
  return { apiBaseUrl, platform: "desktop", title: "Product Starter — Desktop" };
}
