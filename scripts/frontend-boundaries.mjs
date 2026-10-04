import path from "node:path";

export function frontendImportViolation(file, specifier) {
  const normalized = file.replaceAll("\\", "/");
  const owner = /^apps\/([^/]+)\//.exec(normalized)?.[1];
  const web = owner === "web";
  if (/^@capacitor\//.test(specifier) && owner !== "mobile")
    return "Capacitor belongs only to the mobile shell";
  if (/^@tauri-apps\//.test(specifier) && owner !== "desktop")
    return "Tauri belongs only to the desktop shell";
  if (/^(?:vite-plugin-pwa(?:\/|$)|virtual:pwa-|workbox-)/.test(specifier) && !web)
    return "PWA tooling and runtime belong only to Web";
  const namedApp = /^@app\/(web|mobile|desktop|api)(?:\/|$)/.exec(specifier)?.[1];
  if (namedApp && namedApp !== owner) return "Runtime shells must not depend on another app";
  if (specifier.startsWith(".")) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(normalized), specifier));
    const targetApp = /^apps\/([^/]+)(?:\/|$)/.exec(target)?.[1];
    if (targetApp && targetApp !== owner) return "Relative import crosses a runtime shell boundary";
  }
  return undefined;
}

export function frontendSourceViolation(file, source) {
  if (!file.startsWith("apps/web/") && /\bserviceWorker\b/.test(source))
    return "Service-worker access belongs only to Web";
  if (file.startsWith("packages/frontend-app/") && /import\.meta\.env/.test(source))
    return "Frontend build environment belongs in composition roots";
  return undefined;
}
