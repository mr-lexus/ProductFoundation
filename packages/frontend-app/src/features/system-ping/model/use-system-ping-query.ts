import { useQuery } from "@tanstack/react-query";
import { createSystemPingViewModel } from "./create-system-ping-view-model";
import { pingSystem } from "../../../shared/api/system/ping-system";
import { queryKeys } from "../../../shared/api/query-keys";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

export function useSystemPingQuery(platform: FrontendPlatformConfig) {
  return useQuery({
    queryKey: queryKeys.systemPing(platform),
    queryFn: async ({ signal }) => {
      const result = await pingSystem(
        platform,
        {
          platform: platform.platform
        },
        { signal }
      );

      return createSystemPingViewModel(result, platform.apiBaseUrl);
    }
  });
}
