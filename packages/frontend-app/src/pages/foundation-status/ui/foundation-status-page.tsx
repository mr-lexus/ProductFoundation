import { SystemStatusPanel } from "../../../widgets/system-status-panel";
import { useSystemPingQuery } from "../../../features/system-ping";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

interface FoundationStatusPageProps {
  platform: FrontendPlatformConfig;
}

export function FoundationStatusPage({ platform }: FoundationStatusPageProps) {
  const systemPingQuery = useSystemPingQuery(platform);

  return (
    <section className="foundation-status-page">
      <div className="foundation-status-page__toolbar">
        <button
          className="foundation-status-page__button"
          disabled={systemPingQuery.isFetching}
          onClick={() => {
            void systemPingQuery.refetch();
          }}
          type="button"
        >
          {systemPingQuery.isFetching
            ? "Requesting backend..."
            : "Refetch from backend"}
        </button>

        <span className="foundation-status-page__status">
          API base URL: <code>{platform.apiBaseUrl}</code>
        </span>
      </div>

      {systemPingQuery.isError ? (
        <p className="foundation-status-page__error">
          {systemPingQuery.error.message}
        </p>
      ) : null}

      {systemPingQuery.data ? (
        <SystemStatusPanel model={systemPingQuery.data} />
      ) : (
        <p className="foundation-status-page__status">
          Waiting for the first backend response...
        </p>
      )}
    </section>
  );
}
