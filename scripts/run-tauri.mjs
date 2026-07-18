import { spawn } from "node:child_process";
import process from "node:process";

const [command = "build", ...arguments_] = process.argv.slice(2);
if (command !== "build" && command !== "dev") {
  throw new Error("Tauri wrapper supports only build or dev.");
}

const rawApiUrl =
  process.env.VITE_API_URL ??
  (process.env.CI === "true" ? "https://api.example.invalid" : undefined);
if (rawApiUrl === undefined) {
  throw new Error("VITE_API_URL is required for Tauri commands.");
}
const apiUrl = new URL(rawApiUrl);
if (apiUrl.protocol !== "https:" && apiUrl.protocol !== "http:") {
  throw new Error("VITE_API_URL must use http or https.");
}
if (apiUrl.username !== "" || apiUrl.password !== "") {
  throw new Error("VITE_API_URL must not contain credentials.");
}
if (apiUrl.origin !== rawApiUrl) {
  throw new Error("VITE_API_URL must be an exact origin without a path, query, or fragment.");
}
if (command === "build" && apiUrl.protocol !== "https:" && process.env.CI !== "true") {
  throw new Error("Production Tauri builds require an HTTPS VITE_API_URL.");
}

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${apiUrl.origin} ipc: http://ipc.localhost`,
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'"
].join("; ");
const configOverride = JSON.stringify({ app: { security: { csp } } });
const pnpmCliPath = process.env.npm_execpath;
if (pnpmCliPath === undefined) {
  throw new Error("Run Tauri commands through a pnpm workspace script.");
}

const child = spawn(
  process.execPath,
  [
    pnpmCliPath,
    "--filter",
    "@app/desktop",
    "exec",
    "tauri",
    command,
    "--config",
    configOverride,
    ...arguments_
  ],
  { env: process.env, stdio: "inherit" }
);
child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
