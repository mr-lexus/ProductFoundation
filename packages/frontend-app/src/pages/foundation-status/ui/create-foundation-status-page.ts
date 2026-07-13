import { createSystemPingViewModel } from "../../../features/system-ping";
import { createSystemStatusPanel } from "../../../widgets/system-status-panel";
import { pingSystem } from "../../../shared/api/system/ping-system";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

export async function createFoundationStatusPage(
  platform: FrontendPlatformConfig
): Promise<string> {
  const result = await pingSystem(platform, {
    platform: platform.platform
  });
  const model = createSystemPingViewModel(result, platform.apiBaseUrl);

  return createSystemStatusPanel(model);
}
