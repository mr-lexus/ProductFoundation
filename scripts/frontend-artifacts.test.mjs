import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const platforms = ["web", "mobile", "desktop"];

function build(platform) {
  assert.ok(process.env.npm_execpath, "Run through pnpm test:frontend-artifacts.");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [process.env.npm_execpath, "--filter", `@app/${platform}`, "build:runtime"],
      {
        cwd: root,
        env: { ...process.env, VITE_API_URL: "https://api.example.invalid" },
        stdio: "inherit"
      }
    );
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${platform} build failed: ${code}`))
    );
  });
}

async function snapshot(platform) {
  const directory = path.join(root, "apps", platform, "dist");
  const files = await readdir(directory, { recursive: true, withFileTypes: true });
  const hashes = {};
  for (const file of files.filter((entry) => entry.isFile())) {
    const absolute = path.join(file.parentPath, file.name);
    hashes[path.relative(directory, absolute)] = createHash("sha256")
      .update(await readFile(absolute))
      .digest("hex");
  }
  assert.ok(hashes["index.html"], `${platform} must have its own index.html`);
  return hashes;
}

test("sequential and concurrent frontend builds preserve other platform artifacts", async () => {
  await Promise.all(platforms.map(build));
  for (const platform of platforms) {
    const others = platforms.filter((value) => value !== platform);
    const before = await Promise.all(others.map(snapshot));
    await build(platform);
    assert.deepEqual(await Promise.all(others.map(snapshot)), before);
  }
  const before = await Promise.all(platforms.map(snapshot));
  await Promise.all(platforms.map(build));
  assert.deepEqual(await Promise.all(platforms.map(snapshot)), before);
});
