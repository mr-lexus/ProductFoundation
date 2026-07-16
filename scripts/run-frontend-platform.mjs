import { spawn } from "node:child_process";
import process from "node:process";

const [platform, command = "build", ...viteArguments] = process.argv.slice(2);
const titles = {
  desktop: "Product Starter — Desktop",
  mobile: "Product Starter — Mobile",
  web: "Product Starter — Web"
};

if (!(platform in titles)) {
  throw new Error("Frontend platform must be web, mobile or desktop.");
}
if (platform !== "web" && process.env.VITE_API_URL === undefined && process.env.CI !== "true") {
  throw new Error("VITE_API_URL is required for native frontend builds.");
}

const rawApiUrl =
  process.env.VITE_API_URL ??
  (process.env.CI === "true" && platform !== "web" ? "https://api.example.invalid" : undefined);
if (platform !== "web" && rawApiUrl !== undefined) {
  const apiUrl = new URL(rawApiUrl);
  if (
    (apiUrl.protocol !== "https:" && apiUrl.protocol !== "http:") ||
    apiUrl.username !== "" ||
    apiUrl.password !== "" ||
    apiUrl.origin !== rawApiUrl
  ) {
    throw new Error("VITE_API_URL must be an exact http or https origin without credentials.");
  }
  if (
    command === "build" &&
    apiUrl.protocol !== "https:" &&
    process.env.CI !== "true" &&
    process.env.NATIVE_ALLOW_INSECURE_API !== "true"
  ) {
    throw new Error(
      "Native production builds require HTTPS. Set NATIVE_ALLOW_INSECURE_API=true only for local development."
    );
  }
}

const pnpmArguments = ["--filter", "@app/web", "exec", "vite", command, ...viteArguments];
const pnpmCliPath = process.env.npm_execpath;
if (pnpmCliPath === undefined) {
  throw new Error("Run frontend platform commands through a pnpm workspace script.");
}
const child = spawn(process.execPath, [pnpmCliPath, ...pnpmArguments], {
  env: {
    ...process.env,
    VITE_API_URL: rawApiUrl,
    VITE_APP_PLATFORM: platform,
    VITE_APP_TITLE: titles[platform]
  },
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
