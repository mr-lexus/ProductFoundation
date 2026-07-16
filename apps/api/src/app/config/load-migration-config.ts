import {
  migrationDatabaseConfigFromParsedEnvironment,
  parseRuntimeEnvironment
} from "./load-api-config.js";

export function loadMigrationConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = parseRuntimeEnvironment(environment);
  const database = migrationDatabaseConfigFromParsedEnvironment(parsed);
  if (database === undefined) {
    throw new Error("MIGRATION_DATABASE_URL or DATABASE_URL is required to run migrations.");
  }
  return {
    database,
    migrationNamespace: parsed.PRODUCT_MIGRATION_NAMESPACE
  };
}
