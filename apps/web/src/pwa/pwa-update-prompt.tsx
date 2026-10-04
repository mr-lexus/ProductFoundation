import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";
import "./pwa-update-prompt.scss";

export function PwaUpdatePrompt() {
  const [failed, setFailed] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError() {
      // PWA availability must not prevent the application from booting.
      console.warn("Application service worker registration failed.");
    }
  });
  if (!needRefresh) return null;
  return (
    <aside className="pwa-update" aria-label="Application update">
      <p>A new version is available.</p>
      {failed ? <p role="alert">Update failed. Try again when connected.</p> : null}
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          void updateServiceWorker(true).catch(() => setFailed(true));
        }}
      >
        Reload
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </aside>
  );
}
