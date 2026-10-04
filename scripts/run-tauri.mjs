import { spawn } from "node:child_process";
import process from "node:process";
import { nativeApiOrigin, tauriSecurity } from "./native-runtime-config.mts";

const [command = "build", ...arguments_] = process.argv.slice(2);
if (command !== "build" && command !== "dev") {
  throw new Error("Tauri wrapper supports only build or dev.");
}

if (
  arguments_.some(
    (arg) => arg === "--config" || arg.startsWith("-c") || arg.startsWith("--config=")
  )
)
  throw new Error("Security config is owned by the Tauri launcher.");
const apiOrigin = nativeApiOrigin(process.env, "desktop", command === "dev");
const configOverride = JSON.stringify({
  app: { security: tauriSecurity(apiOrigin, command === "dev") }
});
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
