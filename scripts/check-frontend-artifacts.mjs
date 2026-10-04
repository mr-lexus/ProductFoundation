import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const platforms = ["web", "mobile", "desktop"];

export function checkFrontendBuildConfig(platform, config) {
  const shell = path.join(root, "apps", platform);
  assert.equal(path.resolve(config.root), shell, `${platform}: shell must own its Vite root`);
  assert.equal(
    path.resolve(config.root, config.build.outDir),
    path.join(shell, "dist"),
    `${platform}: output must be shell-local`
  );
  assert.equal(config.build.emptyOutDir, true);
  assert.equal(
    config.build.rollupOptions.input,
    undefined,
    "Use the shell's own index.html entrypoint"
  );
  if (platform !== "web") {
    assert.equal(config.publicDir, "", "Native public assets require an explicit boundary review");
    assert.equal(
      config.plugins.some((plugin) => /pwa|workbox/i.test(plugin.name)),
      false,
      "PWA plugin in native build"
    );
  } else {
    assert.equal(path.resolve(config.publicDir), path.join(shell, "public"));
  }
}

export async function checkNativeFrontendArtifacts(directory) {
  const html = await readFile(path.join(directory, "index.html"), "utf8");
  assert.match(html, /<div id="root"><\/div>/);
  assert.doesNotMatch(html, /manifest|apple-touch-icon|serviceWorker|registerSW/);
  for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
    assert.doesNotMatch(
      entry.name,
      /(?:^(?:sw|service-worker|registerSW)\.m?js$|workbox|^manifest\.json$|\.webmanifest$|^icons$)/i
    );
    if (entry.isFile() && /\.m?js$/.test(entry.name))
      assert.doesNotMatch(
        await readFile(path.join(entry.parentPath, entry.name), "utf8"),
        /serviceWorker|workbox-window/
      );
  }
}

export async function checkFrontendArtifacts() {
  const require = createRequire(path.join(root, "apps/web/package.json"));
  const { resolveConfig } = await import(pathToFileURL(require.resolve("vite")).href);
  const previous = process.env.VITE_API_URL;
  process.env.VITE_API_URL = "https://api.example.invalid";
  try {
    for (const platform of platforms) {
      const config = await resolveConfig(
        { configFile: path.join(root, "apps", platform, "vite.config.ts") },
        "build",
        "production",
        "production"
      );
      checkFrontendBuildConfig(platform, config);
      const directory = path.join(root, "apps", platform, "dist");
      if (platform !== "web") await checkNativeFrontendArtifacts(directory);
      else
        assert.match(
          await readFile(path.join(directory, "index.html"), "utf8"),
          /<div id="root"><\/div>/
        );
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_API_URL;
    else process.env.VITE_API_URL = previous;
  }
  const directory = path.join(root, "apps/web/dist");
  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.webmanifest"), "utf8"));
  const sourceManifest = JSON.parse(
    await readFile(path.join(root, "apps/web/pwa-manifest.json"), "utf8")
  );
  assert.deepEqual(manifest, { lang: "en", ...sourceManifest });
  for (const icon of manifest.icons) {
    const png = await readFile(path.join(directory, icon.src));
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  const worker = await readFile(path.join(directory, "sw.js"), "utf8");
  assert.match(worker, /NavigationRoute/);
  console.log("Frontend roots, outputs, manifest/icons and native PWA exclusion passed.");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  await checkFrontendArtifacts();
