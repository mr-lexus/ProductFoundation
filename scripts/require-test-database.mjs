import process from "node:process";

if (process.env.TEST_DATABASE_URL === undefined || process.env.TEST_DATABASE_URL.length === 0) {
  process.stderr.write(
    "TEST_DATABASE_URL is required for integration tests; refusing to convert them into skips.\n"
  );
  process.exitCode = 1;
}
