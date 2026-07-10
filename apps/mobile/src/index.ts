import type { FrontendPlatformConfig } from "@gtd-planner/frontend-app";

export const mobilePlatform: Omit<FrontendPlatformConfig, "apiBaseUrl"> = {
  platform: "mobile",
  title: "GTD Planner Mobile Demo"
};
