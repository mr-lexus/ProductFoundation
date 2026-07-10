import type { ClientPlatform } from "@gtd-planner/contracts";

export interface FrontendPlatformConfig {
  apiBaseUrl: string;
  platform: ClientPlatform;
  title: string;
}
