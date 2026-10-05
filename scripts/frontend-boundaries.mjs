import path from "node:path";

const frontendSourceRoot = "packages/frontend-app/src";
const frontendLayers = ["shared", "entities", "features", "widgets", "pages", "app"];
const frontendPublicApiLayers = new Set(["entities", "features", "widgets", "pages"]);

function resolveFrontendImport(file, specifier) {
  const normalizedFile = file.replaceAll("\\", "/");
  if (!normalizedFile.startsWith(`${frontendSourceRoot}/`)) return undefined;

  if (specifier.startsWith(".")) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(normalizedFile), specifier));
  }
  if (specifier.startsWith("@/")) {
    return path.posix.join(frontendSourceRoot, specifier.slice(2));
  }
  if (specifier.startsWith("@app/frontend-app/")) {
    const packagePath = specifier.slice("@app/frontend-app/".length).replace(/^src\//, "");
    return path.posix.join(frontendSourceRoot, packagePath);
  }
  return undefined;
}

export function frontendFsdImportViolation(file, specifier) {
  const normalizedFile = file.replaceAll("\\", "/");
  const target = resolveFrontendImport(normalizedFile, specifier);
  if (target === undefined || !target.startsWith(`${frontendSourceRoot}/`)) return undefined;

  const sourceParts = normalizedFile.slice(frontendSourceRoot.length + 1).split("/");
  const targetParts = target.slice(frontendSourceRoot.length + 1).split("/");
  const sourceLayer = sourceParts[0];
  const targetLayer = targetParts[0];
  const sourceRank = frontendLayers.indexOf(sourceLayer);
  const targetRank = frontendLayers.indexOf(targetLayer);

  if (sourceRank === -1 || targetRank === -1) return undefined;
  if (targetRank > sourceRank) {
    return `FSD dependency points upward from ${sourceLayer} to ${targetLayer}`;
  }

  if (frontendPublicApiLayers.has(targetLayer) && targetParts.length > 2) {
    const staysInsideSlice = sourceLayer === targetLayer && sourceParts[1] === targetParts[1];
    if (!staysInsideSlice) {
      return `cross-slice import bypasses the ${targetLayer}/${targetParts[1]} public API`;
    }
  }
  return undefined;
}

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
