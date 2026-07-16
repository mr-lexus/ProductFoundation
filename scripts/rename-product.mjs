import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

function parseArguments(arguments_) {
  const values = new Map();
  let write = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--write") {
      write = true;
      continue;
    }
    if (argument === "--") {
      continue;
    }
    if (!["--name", "--slug", "--id", "--namespace"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument ?? "<missing>"}`);
    }
    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${argument} requires a value.`);
    }
    values.set(argument, value);
    index += 1;
  }
  for (const required of ["--name", "--slug", "--id", "--namespace"]) {
    if (!values.has(required)) {
      throw new Error(`${required} is required.`);
    }
  }
  return {
    id: values.get("--id"),
    name: values.get("--name"),
    namespace: values.get("--namespace"),
    slug: values.get("--slug"),
    write
  };
}

function validate(options) {
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .&'()-]{1,79}$/u.test(options.name)) {
    throw new Error("--name must be 2-80 display-safe characters.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) {
    throw new Error("--slug must use lowercase letters, digits and single hyphens.");
  }
  if (!/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}$/.test(options.id)) {
    throw new Error("--id must be a lowercase reverse-DNS identifier with at least three parts.");
  }
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(options.namespace) || options.namespace === "platform") {
    throw new Error("--namespace must be a safe PostgreSQL identifier other than platform.");
  }
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { encoding: "buffer" });
  if (result.status !== 0) {
    throw new Error("Unable to list tracked repository files.");
  }
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function replaceAll(source, replacements) {
  let result = source;
  for (const [placeholder, value] of replacements) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  validate(options);
  const replacements = [
    ["com.example.product", options.id],
    ["product-foundation-starter", options.slug],
    ["Product Starter", options.name],
    ["app.reference_durable_probes", `${options.namespace}.reference_durable_probes`],
    ["PRODUCT_MIGRATION_NAMESPACE=app", `PRODUCT_MIGRATION_NAMESPACE=${options.namespace}`],
    ['default("app")', `default("${options.namespace}")`],
    ["SCHEMA app", `SCHEMA ${options.namespace}`],
    ["app_process", `${options.namespace}_process`],
    ["app_http", `${options.namespace}_http`],
    ["app_worker", `${options.namespace}_worker`],
    ["app_api", `${options.namespace}_api`],
    ["app_runtime", `${options.namespace}_runtime`],
    ["- `app` — product migration/schema", `- \`${options.namespace}\` — product migration/schema`],
    ["- `app` — migration/schema", `- \`${options.namespace}\` — migration/schema`]
  ];
  const changed = [];
  for (const file of trackedFiles()) {
    if (file === "scripts/rename-product.mjs") {
      continue;
    }
    let buffer;
    try {
      buffer = await readFile(file);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    if (buffer.includes(0)) {
      continue;
    }
    const source = buffer.toString("utf8");
    const next = replaceAll(source, replacements);
    if (next !== source) {
      changed.push(file);
      if (options.write) {
        await writeFile(file, next, "utf8");
      }
    }
  }
  process.stdout.write(
    `${JSON.stringify({ changedFiles: changed, mode: options.write ? "write" : "dry-run" }, null, 2)}\n`
  );
  if (changed.length === 0) {
    process.stdout.write("No placeholders matched. The rename may already be applied.\n");
  } else if (!options.write) {
    process.stdout.write("Dry-run only. Re-run with --write after reviewing this list.\n");
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
