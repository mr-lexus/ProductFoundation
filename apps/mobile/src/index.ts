import type { FrontendPlatformConfig } from "@app/frontend-app";

export const mobilePlatform: Omit<FrontendPlatformConfig, "apiBaseUrl"> = {
  platform: "mobile",
  title: "Product Starter — Mobile"
};
