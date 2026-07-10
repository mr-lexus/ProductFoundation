import { createHelloWorldViewModel } from "../../../features/hello-world/model/create-hello-world-view-model";
import { createHelloWorldPanel } from "../../../widgets/hello-world-panel/ui/create-hello-world-panel";
import { getHelloWorld } from "../../../shared/api/hello/get-hello-world";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

export async function createHelloWorldPage(
  platform: FrontendPlatformConfig
): Promise<string> {
  const response = await getHelloWorld(platform, {
    platform: platform.platform
  });
  const model = createHelloWorldViewModel(response, platform.apiBaseUrl);

  return createHelloWorldPanel(model);
}
