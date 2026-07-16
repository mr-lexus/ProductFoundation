import { PostgresDatabase, PostgresOutboxStore } from "@product-foundation/backend-postgres";
import { loadWorkerConfig } from "../config/load-worker-config.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function run() {
  const [command, messageId, confirmation] = process.argv.slice(2);
  if (command !== "inspect" && command !== "replay") {
    throw new Error("Usage: outbox-admin inspect | replay <message-uuid> --confirm");
  }
  if (command === "replay") {
    if (messageId === undefined || !UUID_PATTERN.test(messageId) || confirmation !== "--confirm") {
      throw new Error("Replay requires a valid message UUID followed by --confirm.");
    }
  }

  const config = loadWorkerConfig();
  const database = new PostgresDatabase({
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    maxConnections: 1,
    url: config.database.url
  });
  const store = new PostgresOutboxStore(database, database);
  try {
    if (command === "inspect") {
      process.stdout.write(`${JSON.stringify(await store.inspect())}\n`);
      return;
    }
    const replayed = await store.requeueDeadLetter(messageId as string);
    process.stdout.write(
      `${JSON.stringify({ event: "outbox_dead_letter_requeue", messageId, replayed })}\n`
    );
    if (!replayed) {
      process.exitCode = 2;
    }
  } finally {
    await database.close();
  }
}

run().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      errorName: error instanceof Error ? error.name : "UnknownError",
      event: "outbox_admin_failed",
      level: "error"
    })}\n`
  );
  process.exitCode = 1;
});
