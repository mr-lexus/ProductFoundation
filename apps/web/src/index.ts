import type { FrontendPlatformConfig } from "@app/frontend-app";

const DEFAULT_API_URL = "http://localhost:3001";
const platformTitles = {
  desktop: "Product Starter — Desktop",
  mobile: "Product Starter — Mobile",
  web: "Product Starter — Web"
} as const;

function resolvePlatform(value: string | undefined): FrontendPlatformConfig["platform"] {
  if (value === undefined || value === "web") {
    return "web";
  }
  if (value === "mobile" || value === "desktop") {
    return value;
  }
  throw new Error(`Unsupported frontend platform: ${value}.`);
}

export function createWebPlatformConfig(): FrontendPlatformConfig {
  const platform = resolvePlatform(import.meta.env.VITE_APP_PLATFORM);
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? DEFAULT_API_URL : "");

  if (platform !== "web" && apiBaseUrl.length === 0) {
    throw new Error("VITE_API_URL is required for native frontend builds.");
  }

  return {
    apiBaseUrl,
    platform,
    title: import.meta.env.VITE_APP_TITLE ?? platformTitles[platform]
  };
}
