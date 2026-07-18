import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createProductReplacements, replaceAll } from "./rename-product.mjs";

function run(command, arguments_, cwd) {
  return spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8"
  });
}

const exampleProduct = {
  id: "com.acme.example",
  name: "Example Product",
  namespace: "example",
  slug: "example-product"
};

test("product rename replacements are deterministic after a repository rename", () => {
  const replacements = createProductReplacements(exampleProduct);
  const placeholders = replacements.map(([placeholder]) => placeholder).join("\n");
  const expected = replacements.map(([, value]) => value).join("\n");
  const renamed = replaceAll(placeholders, replacements);

  assert.equal(renamed, expected);
  assert.equal(replaceAll(renamed, replacements), renamed);
});

test("canonical repository rename covers runtime identifiers", async (context) => {
  const workspaceRoot = path.resolve(import.meta.dirname, "..");
  const workspaceManifest = JSON.parse(
    await readFile(path.join(workspaceRoot, "package.json"), "utf8")
  );
  const canonicalSlug = ["product", "foundation", "starter"].join("-");
  if (workspaceManifest.name !== canonicalSlug) {
    context.skip("repository has already been product-renamed");
    return;
  }
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "product-foundation-rename-"));

  try {
    const listed = run("git", ["ls-files", "-z"], workspaceRoot);
    assert.equal(listed.status, 0, listed.stderr);
    for (const file of listed.stdout.split("\0").filter(Boolean)) {
      const destination = path.join(temporaryRoot, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(workspaceRoot, file), destination).catch((error) => {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return;
        }
        throw error;
      });
    }
    assert.equal(run("git", ["init", "--quiet"], temporaryRoot).status, 0);
    assert.equal(run("git", ["add", "."], temporaryRoot).status, 0);

    const arguments_ = [
      "scripts/rename-product.mjs",
      "--name",
      exampleProduct.name,
      "--slug",
      exampleProduct.slug,
      "--id",
      exampleProduct.id,
      "--namespace",
      exampleProduct.namespace,
      "--write"
    ];
    const renamed = run(process.execPath, arguments_, temporaryRoot);
    assert.equal(renamed.status, 0, renamed.stderr);

    const rootManifest = JSON.parse(
      await readFile(path.join(temporaryRoot, "package.json"), "utf8")
    );
    assert.equal(rootManifest.name, "example-product");
    const tauriConfig = JSON.parse(
      await readFile(path.join(temporaryRoot, "apps/desktop/src-tauri/tauri.conf.json"), "utf8")
    );
    assert.equal(tauriConfig.identifier, "com.acme.example.desktop");
    assert.equal(tauriConfig.productName, "Example Product");
    assert.match(
      await readFile(
        path.join(temporaryRoot, "apps/api/migrations/0001_reference_durable_probe.sql"),
        "utf8"
      ),
      /CREATE SCHEMA IF NOT EXISTS example;/
    );
    const compose = await readFile(path.join(temporaryRoot, "compose.yaml"), "utf8");
    assert.match(compose, /example_runtime/);
    assert.match(compose, /POSTGRES_DB: example/);
    assert.doesNotMatch(compose, /postgresql:\/\/app(?::|_runtime:)/);
    const postgresInitialization = await readFile(
      path.join(temporaryRoot, "scripts/postgres-init/001-runtime-role.sql"),
      "utf8"
    );
    assert.match(postgresInitialization, /SCHEMA IF NOT EXISTS example AUTHORIZATION example/);
    assert.match(postgresInitialization, /DATABASE example TO example_runtime/);

    const replacements = createProductReplacements(exampleProduct);
    for (const file of listed.stdout.split("\0").filter(Boolean)) {
      if (file === "scripts/rename-product.mjs") {
        continue;
      }
      const source = await readFile(path.join(temporaryRoot, file)).catch(() => undefined);
      if (source === undefined || source.includes(0)) {
        continue;
      }
      const text = source.toString("utf8");
      assert.equal(replaceAll(text, replacements), text, `${file} was not renamed idempotently`);
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
});
