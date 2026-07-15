import { spawn } from "node:child_process";

const port = 39_127;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["--enable-source-maps", "apps/api/dist/server.js"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForApi() {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production API exited early.\n${output}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health/live`);
      if (response.ok) {
        return;
      }
    } catch {
      // The process may still be binding its listener.
    }

    await delay(100);
  }

  throw new Error(`Production API did not become healthy.\n${output}`);
}

try {
  await waitForApi();
  process.stdout.write("Production API smoke test passed.\n");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5_000).then(() => child.kill("SIGKILL"))
  ]);
}
