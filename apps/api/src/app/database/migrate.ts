import { loadApiConfig } from "../config/load-api-config.js";
import {
  foundationMigrationsDirectory,
  runSqlMigrations
} from "@product-foundation/backend-postgres";

async function migrate() {
  const config = loadApiConfig();
  if (config.database === undefined) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  await runSqlMigrations({
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    directory: foundationMigrationsDirectory,
    namespace: "foundation",
    url: config.database.url
  });

  process.stdout.write("Database migrations completed.\n");
}

migrate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Database migration failed: ${message}\n`);
  process.exitCode = 1;
});
