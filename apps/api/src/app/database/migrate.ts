import {
  foundationMigrationsDirectory,
  runSqlMigrations
} from "@product-foundation/backend-postgres";
import { loadMigrationConfig } from "../config/load-migration-config.js";

const productMigrationsDirectory = new URL("../../../migrations/", import.meta.url);

async function migrate() {
  const config = loadMigrationConfig();

  await runSqlMigrations({
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    directory: foundationMigrationsDirectory,
    namespace: "foundation",
    url: config.database.url
  });
  await runSqlMigrations({
    allowEmpty: true,
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    directory: productMigrationsDirectory,
    namespace: config.migrationNamespace,
    url: config.database.url
  });

  process.stdout.write("Database migrations completed.\n");
}

migrate().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      errorName: error instanceof Error ? error.name : "UnknownError",
      event: "database_migration_failed",
      level: "fatal"
    })}\n`
  );
  process.exitCode = 1;
});
