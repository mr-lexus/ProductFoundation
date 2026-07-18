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

const dockerViaWsl = process.platform === "win32" && process.env.COMPOSE_DOCKER_VIA_WSL === "true";
const docker = dockerViaWsl ? "wsl.exe" : process.platform === "win32" ? "docker.exe" : "docker";
const [apiPort, databasePort] = await Promise.all([availablePort(), availablePort()]);
const projectSuffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const environment = {
  ...process.env,
  API_PORT: String(apiPort),
  COMPOSE_PROJECT_NAME: `foundation-smoke-${projectSuffix}`,
  DATABASE_PORT: String(databasePort)
};
const dockerArguments = dockerViaWsl
  ? [
      "env",
      `API_PORT=${environment.API_PORT}`,
      `COMPOSE_PROJECT_NAME=${environment.COMPOSE_PROJECT_NAME}`,
      `DATABASE_PORT=${environment.DATABASE_PORT}`,
      "docker"
    ]
  : [];

async function callRpc(apiPort, path, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${apiPort}${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST"
  });
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) {
    throw new Error(`Compose RPC ${path} failed with status ${response.status}.`);
  }
  return payload.data;
}

async function waitForReferenceDelivery(apiPort, id) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const probe = await callRpc(apiPort, "/rpc/v1/reference-durable-probe-status", { id });
    if (probe.deliveredAt !== null) {
      return probe;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Reference durable probe was not delivered by the worker in time.");
}

try {
  await run(
    docker,
    [...dockerArguments, "compose", "up", "--build", "--detach", "--wait", "--wait-timeout", "180"],
    environment
  );
  const ping = await callRpc(apiPort, "/rpc/v1/system-ping", { platform: "web" });
  if (ping.status !== "ready") {
    throw new Error("Compose system ping returned an unexpected status.");
  }

  const id = crypto.randomUUID();
  const request = { id, value: "compose-durable-proof" };
  const headers = { "x-idempotency-key": `compose-${id}` };
  const created = await callRpc(
    apiPort,
    "/rpc/v1/reference-durable-probe-create",
    request,
    headers
  );
  const replayed = await callRpc(
    apiPort,
    "/rpc/v1/reference-durable-probe-create",
    request,
    headers
  );
  if (JSON.stringify(created) !== JSON.stringify(replayed)) {
    throw new Error("Reference durable mutation did not replay the stored response.");
  }
  const delivered = await waitForReferenceDelivery(apiPort, id);
  if (delivered.value !== request.value) {
    throw new Error("Reference durable worker projection returned an unexpected value.");
  }

  process.stdout.write(
    "Compose API, migrations, idempotent mutation, database, outbox and worker smoke passed.\n"
  );
} catch (error) {
  process.stderr.write(
    "Compose smoke failed; collecting service status and logs before cleanup.\n"
  );
  await run(docker, [...dockerArguments, "compose", "ps", "--all"], environment).catch(
    () => undefined
  );
  await run(docker, [...dockerArguments, "compose", "logs", "--no-color"], environment).catch(
    () => undefined
  );
  throw error;
} finally {
  await run(
    docker,
    [...dockerArguments, "compose", "down", "--volumes", "--remove-orphans"],
    environment
  ).catch((error) => {
    process.stderr.write(`Compose cleanup failed: ${error.name}.\n`);
  });
}
