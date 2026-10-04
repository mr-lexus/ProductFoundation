import { useQuery } from "@tanstack/react-query";
import { createSystemStatusModel } from "../../../entities/system";
import { useApiClient } from "../../../shared/api/api-client-provider";
import { queryKeys } from "../../../shared/api/query-keys";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

export function useSystemPingQuery(platform: FrontendPlatformConfig) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: queryKeys.systemPing(platform),
    queryFn: async ({ signal }) => {
      const result = await apiClient.pingSystem(
        {
          platform: platform.platform
        },
        { signal }
      );

      return createSystemStatusModel(result, platform.apiBaseUrl);
    }
  });
}
