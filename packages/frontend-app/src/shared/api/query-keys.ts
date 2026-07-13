import type { FrontendPlatformConfig } from "../config/platform";

export const queryKeys = {
  systemPing(platform: FrontendPlatformConfig) {
    return ["system-ping", platform.platform, platform.apiBaseUrl] as const;
  }
};
