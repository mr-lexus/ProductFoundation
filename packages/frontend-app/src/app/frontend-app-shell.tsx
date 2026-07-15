import { FoundationStatusPage } from "../pages/foundation-status";
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
          This neutral smoke screen verifies the shared frontend, versioned RPC, NestJS API and
          runtime shell before product code is added.
        </p>
      </header>

      <FoundationStatusPage platform={platform} />
    </main>
  );
}
