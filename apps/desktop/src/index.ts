import type { FrontendPlatformConfig } from "@app/frontend-app";

export const desktopPlatform: Omit<FrontendPlatformConfig, "apiBaseUrl"> = {
  platform: "desktop",
  title: "Product Starter — Desktop"
};
