import { useQuery } from "@tanstack/react-query";
import { createHelloWorldViewModel } from "./create-hello-world-view-model";
import { getHelloWorld } from "../../../shared/api/hello/get-hello-world";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

export function useHelloWorldQuery(platform: FrontendPlatformConfig) {
  return useQuery({
    queryKey: ["hello-world", platform.platform, platform.apiBaseUrl],
    queryFn: async () => {
      const response = await getHelloWorld(platform, {
        platform: platform.platform
      });

      return createHelloWorldViewModel(response, platform.apiBaseUrl);
    }
  });
}
