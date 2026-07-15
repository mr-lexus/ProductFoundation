import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

function run(command, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: environment,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${command} was terminated by ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}.`));
        return;
      }
      resolve();
    });
  });
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Could not allocate a local TCP port."));
        return;
      }
      server.close((error) => (error === undefined ? resolve(address.port) : reject(error)));
    });
  });
}

const docker = process.platform === "win32" ? "docker.exe" : "docker";
const [apiPort, databasePort] = await Promise.all([availablePort(), availablePort()]);
const environment = {
  ...process.env,
  API_PORT: String(apiPort),
  COMPOSE_PROJECT_NAME: `foundation-smoke-${process.pid}`,
  DATABASE_PORT: String(databasePort)
};

try {
  await run(docker, ["compose", "up", "--build", "--detach", "--wait"], environment);
  const response = await fetch(`http://127.0.0.1:${apiPort}/rpc/v1/system-ping`, {
    body: JSON.stringify({ platform: "web" }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true || payload?.data?.status !== "ready") {
    throw new Error(`Compose RPC smoke failed with status ${response.status}.`);
  }
  process.stdout.write("Compose API, migration, database and worker smoke passed.\n");
} finally {
  await run(docker, ["compose", "down", "--volumes", "--remove-orphans"], environment).catch(
    (error) => {
      process.stderr.write(`Compose cleanup failed: ${error.name}.\n`);
    }
  );
}
