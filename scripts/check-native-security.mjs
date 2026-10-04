import { readFile } from "node:fs/promises";
import process from "node:process";

const tauriConfig = JSON.parse(
  await readFile(new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8")
);
const capacitorSource = await readFile(
  new URL("../apps/mobile/capacitor.config.ts", import.meta.url),
  "utf8"
);
const tauriWrapper = await readFile(new URL("./run-tauri.mjs", import.meta.url), "utf8");
const frontendWrapper = await readFile(
  new URL("./run-frontend-platform.mjs", import.meta.url),
  "utf8"
);
const violations = [];

const csp = tauriConfig?.app?.security?.csp;
if (typeof csp !== "string") {
  violations.push("Tauri CSP must be enabled.");
} else {
  const connectSources = csp
    .split(";")
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === "connect-src")
    ?.slice(1);
  if (connectSources === undefined) {
    violations.push("Tauri CSP must define connect-src.");
  } else if (
    connectSources.some((source) => source === "*" || source === "http:" || source === "https:")
  ) {
    violations.push("Tauri base CSP must not allow wildcard http/https connections.");
  }
}
if (/allowNavigation\s*:\s*\[\s*["']\*["']\s*\]/.test(capacitorSource)) {
  violations.push("Capacitor allowNavigation must not use a wildcard.");
}
if (!capacitorSource.includes("CAP_LIVE_RELOAD")) {
  violations.push("Capacitor live reload must require an explicit development flag.");
}
if (
  !tauriWrapper.includes("apiUrl.origin") ||
  !tauriWrapper.includes("apiUrl.origin !== rawApiUrl")
) {
  violations.push("Tauri wrapper must require and allow only the exact configured API origin.");
}
if (
  !frontendWrapper.includes("NATIVE_ALLOW_INSECURE_API") ||
  !frontendWrapper.includes("apiUrl.origin !== rawApiUrl")
) {
  violations.push(
    "Mobile builds must validate exact API origins and require an explicit HTTP opt-in."
  );
}

if (violations.length > 0) {
  process.stderr.write("Native security check failed:\n");
  for (const violation of violations) {
    process.stderr.write(`- ${violation}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write("Native security check passed.\n");
}
