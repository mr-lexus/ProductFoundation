import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function checkNativeConfiguration(tauri, capacitor) {
  const errors = [];
  const csp = tauri.app?.security?.csp;
  if (typeof csp !== "string") errors.push("Tauri CSP must be enabled.");
  else {
    const directives = new Map(
      csp.split(";").map((part) => {
        const [name, ...values] = part.trim().split(/\s+/);
        return [name, values];
      })
    );
    const sources = directives.get("connect-src");
    if (
      !sources ||
      sources.some(
        (value) => value.includes("*") || ["http:", "https:", "ws:", "wss:"].includes(value)
      )
    )
      errors.push("Tauri connect-src must use exact origins.");
    if (directives.get("script-src")?.join(" ") !== "'self'")
      errors.push("Tauri script-src must remain self-only.");
  }
  if (tauri.build?.frontendDist !== "../dist") errors.push("Tauri must package desktop/dist.");
  if (tauri.build?.devUrl !== "http://127.0.0.1:1422")
    errors.push("Tauri development must use the desktop origin.");
  if (
    tauri.app?.windows?.some(
      (window) => window.useHttpsScheme !== false || (window.url && window.url !== "index.html")
    )
  )
    errors.push(
      "Tauri packaged origin configuration changed; update origin verification explicitly."
    );
  if (capacitor.webDir !== "dist") errors.push("Capacitor must package mobile/dist.");
  const server = capacitor.server;
  if (
    server?.hostname !== "localhost" ||
    server.iosScheme !== "capacitor" ||
    server.androidScheme !== "https"
  )
    errors.push("Capacitor packaged origins must match the verified origin table.");
  if (server?.url || server?.cleartext || server?.allowNavigation?.length)
    errors.push("Production Capacitor config must not enable live reload/navigation.");
  if (capacitor.android?.allowMixedContent)
    errors.push("Production Capacitor config must not permit mixed content.");
  return errors;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const tauri = JSON.parse(
    await readFile(new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8")
  );
  const { default: capacitor } = await import("../apps/mobile/capacitor.config.ts");
  const errors = checkNativeConfiguration(tauri, capacitor);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Native configuration security check passed.");
}
