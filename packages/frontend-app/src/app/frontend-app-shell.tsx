import { HelloWorldPage } from "../pages/hello-world/ui/hello-world-page";
import type { FrontendPlatformConfig } from "../shared/config/platform";

interface FrontendAppShellProps {
  platform: FrontendPlatformConfig;
}

export function FrontendAppShell({ platform }: FrontendAppShellProps) {
  return (
    <main className="frontend-app">
      <header className="frontend-app__header">
        <p className="frontend-app__eyebrow">Shared frontend package</p>
        <h1 className="frontend-app__title">{platform.title}</h1>
        <p className="frontend-app__subtitle">
          Frontend shell calls the Hono backend over HTTP and renders the shared
          UI from <code>packages/frontend-app</code>.
        </p>
      </header>

      <HelloWorldPage platform={platform} />
    </main>
  );
}
