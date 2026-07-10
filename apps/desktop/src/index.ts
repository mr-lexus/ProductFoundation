import type { FrontendPlatformConfig } from "@gtd-planner/frontend-app";

export const desktopPlatform: Omit<FrontendPlatformConfig, "apiBaseUrl"> = {
  platform: "desktop",
  title: "GTD Planner Desktop Demo"
};
