import { spawnSync } from "node:child_process";
import path from "node:path";
import { capacitorServer, nativeApiOrigin } from "./native-runtime-config.mts";

const args = process.argv.slice(2);
const development = args[0] === "--development";
if (development) args.shift();
if (args.some((arg) => !["android", "ios"].includes(arg)) || args.length > 1) {
  throw new Error("Usage: run-capacitor.mjs [--development] [android|ios]");
}
const environment = { ...process.env, NODE_ENV: development ? "development" : "production" };
capacitorServer(environment);
nativeApiOrigin(environment, "mobile", development);
const cli = process.env.npm_execpath;
if (!cli) throw new Error("Run through pnpm cap:sync or cap:sync:dev.");
const root = path.resolve(import.meta.dirname, "..");
for (const command of [
  ["build:frontend-dependencies"],
  [
    "--filter",
    "@app/mobile",
    "exec",
    "vite",
    "build",
    ...(development ? ["--mode", "development"] : [])
  ],
  ["--filter", "@app/mobile", "exec", "cap", "sync", ...args]
]) {
  const result = spawnSync(process.execPath, [cli, ...command], {
    cwd: root,
    env: environment,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
