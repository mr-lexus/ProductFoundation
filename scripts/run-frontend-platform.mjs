import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const [platform, command = "build", ...viteArguments] = process.argv.slice(2);
if (!["web", "mobile", "desktop"].includes(platform)) throw new Error("Unknown frontend platform.");
if (!["build", "dev"].includes(command)) throw new Error("Expected build or dev.");

const pnpmArguments = ["--filter", `@app/${platform}`, "exec", "vite", command, ...viteArguments];
const pnpmCliPath = process.env.npm_execpath;
if (pnpmCliPath === undefined) {
  throw new Error("Run frontend platform commands through a pnpm workspace script.");
}
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dependencies = spawnSync(process.execPath, [pnpmCliPath, "build:frontend-dependencies"], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: "inherit"
});
if (dependencies.error !== undefined) {
  throw dependencies.error;
}
if (dependencies.signal !== null) {
  process.kill(process.pid, dependencies.signal);
} else if (dependencies.status !== 0) {
  process.exit(dependencies.status ?? 1);
}
const child = spawn(process.execPath, [pnpmCliPath, ...pnpmArguments], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: "inherit"
});

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
