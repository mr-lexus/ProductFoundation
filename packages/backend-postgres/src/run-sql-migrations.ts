import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import type { QueryResultRow } from "pg";
import { Pool } from "pg";

interface AppliedMigrationRow extends QueryResultRow {
  readonly checksum: string;
}

export interface RunSqlMigrationsOptions {
  readonly allowEmpty?: boolean;
  readonly connectionTimeoutMs: number;
  readonly directory: URL;
  readonly lockName?: string;
  readonly namespace?: string;
  readonly url: string;
}

const migrationFilePattern = /^\d{4}_[a-z0-9_]+\.sql$/;
const migrationNamespacePattern = /^[a-z0-9][a-z0-9_-]{0,62}$/;

function checksum(contents: string) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function runSqlMigrations(options: RunSqlMigrationsOptions) {
  const namespace = options.namespace ?? "foundation";
  if (!migrationNamespacePattern.test(namespace)) {
    throw new Error("Migration namespace contains unsupported characters.");
  }

  const pool = new Pool({
    connectionString: options.url,
    connectionTimeoutMillis: options.connectionTimeoutMs,
    max: 1
  });
  const client = await pool.connect().catch(async (error: unknown) => {
    await pool.end();
    throw error;
  });
  const lockName = options.lockName ?? "product-foundation-schema-migrations";
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);
    lockAcquired = true;

    await client.query("CREATE SCHEMA IF NOT EXISTS platform");
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform.schema_migrations (
        namespace text NOT NULL DEFAULT 'foundation',
        name text NOT NULL,
        checksum text NOT NULL,
        applied_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      ALTER TABLE platform.schema_migrations
      ADD COLUMN IF NOT EXISTS namespace text NOT NULL DEFAULT 'foundation'
    `);
    await client.query(`
      ALTER TABLE platform.schema_migrations
      DROP CONSTRAINT IF EXISTS schema_migrations_pkey
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_namespace_name_idx
      ON platform.schema_migrations (namespace, name)
    `);

    const migrationNames = (await readdir(options.directory))
      .filter((name) => migrationFilePattern.test(name))
      .sort();

    if (migrationNames.length === 0 && options.allowEmpty !== true) {
      throw new Error("No SQL migration files were found.");
    }

    for (const name of migrationNames) {
      const contents = await readFile(new URL(name, options.directory), "utf8");
      const expectedChecksum = checksum(contents);
      const applied = await client.query<AppliedMigrationRow>(
        `SELECT checksum FROM platform.schema_migrations
         WHERE namespace = $1 AND name = $2`,
        [namespace, name]
      );

      if (applied.rows[0] !== undefined) {
        if (applied.rows[0].checksum !== expectedChecksum) {
          throw new Error(`Applied migration ${namespace}/${name} has been modified.`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(contents);
        await client.query(
          `INSERT INTO platform.schema_migrations (namespace, name, checksum)
           VALUES ($1, $2, $3)`,
          [namespace, name, expectedChecksum]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (lockAcquired) {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]);
    }
    client.release();
    await pool.end();
  }
}
