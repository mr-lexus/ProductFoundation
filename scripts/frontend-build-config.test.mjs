import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkFrontendBuildConfig,
  checkNativeFrontendArtifacts
} from "./check-frontend-artifacts.mjs";

test("native artifact gate rejects workers, manifests and registration code", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "foundation-artifact-gate-"));
  try {
    await writeFile(path.join(directory, "index.html"), '<div id="root"></div>');
    await checkNativeFrontendArtifacts(directory);
    for (const file of [
      "sw.js",
      "service-worker.js",
      "workbox-test.js",
      "manifest.webmanifest",
      "manifest.json"
    ]) {
      await writeFile(path.join(directory, file), "");
      await assert.rejects(checkNativeFrontendArtifacts(directory));
      await rm(path.join(directory, file));
    }
    await writeFile(
      path.join(directory, "bundle.mjs"),
      "navigator.serviceWorker.register('/sw.js')"
    );
    await assert.rejects(checkNativeFrontendArtifacts(directory));
    await rm(path.join(directory, "bundle.mjs"));
    await writeFile(
      path.join(directory, "index.html"),
      '<div id="root"></div><link rel="manifest" href="/manifest.webmanifest">'
    );
    await assert.rejects(checkNativeFrontendArtifacts(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("resolved build gate rejects shared roots, outputs, assets and native PWA plugins", () => {
  const root = path.resolve(import.meta.dirname, "../apps/mobile");
  const config = {
    root,
    publicDir: "",
    plugins: [],
    build: { outDir: "dist", emptyOutDir: true, rollupOptions: {} }
  };
  checkFrontendBuildConfig("mobile", config);
  for (const invalid of [
    { ...config, root: path.resolve(root, "../web") },
    { ...config, build: { ...config.build, outDir: "../web/dist" } },
    { ...config, publicDir: path.resolve(root, "../web/public") },
    { ...config, plugins: [{ name: "vite-plugin-pwa" }] },
    { ...config, build: { ...config.build, rollupOptions: { input: "../web/index.html" } } }
  ])
    assert.throws(() => checkFrontendBuildConfig("mobile", invalid));
});
