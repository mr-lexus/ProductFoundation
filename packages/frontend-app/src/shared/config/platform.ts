import type { ClientPlatform } from "@app/contracts";

export interface FrontendPlatformConfig {
  apiBaseUrl: string;
  platform: ClientPlatform;
  title: string;
}
