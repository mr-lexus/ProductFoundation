import { HelloWorldPanel } from "../../../widgets/hello-world-panel/ui/hello-world-panel";
import { useHelloWorldQuery } from "../../../features/hello-world/model/use-hello-world-query";
import type { FrontendPlatformConfig } from "../../../shared/config/platform";

interface HelloWorldPageProps {
  platform: FrontendPlatformConfig;
}

export function HelloWorldPage({ platform }: HelloWorldPageProps) {
  const helloWorldQuery = useHelloWorldQuery(platform);

  return (
    <section className="hello-world-page">
      <div className="hello-world-page__toolbar">
        <button
          className="hello-world-page__button"
          disabled={helloWorldQuery.isFetching}
          onClick={() => {
            void helloWorldQuery.refetch();
          }}
          type="button"
        >
          {helloWorldQuery.isFetching ? "Requesting backend..." : "Refetch from backend"}
        </button>

        <span className="hello-world-page__status">
          API base URL: <code>{platform.apiBaseUrl}</code>
        </span>
      </div>

      {helloWorldQuery.isError ? (
        <p className="hello-world-page__error">
          {(helloWorldQuery.error as Error).message}
        </p>
      ) : null}

      {helloWorldQuery.data ? (
        <HelloWorldPanel model={helloWorldQuery.data} />
      ) : (
        <p className="hello-world-page__status">Waiting for the first backend response...</p>
      )}
    </section>
  );
}
