import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkNativeConfiguration } from "./check-native-security.mjs";
import {
  capacitorServer,
  exactHttpOrigin,
  nativeApiOrigin,
  tauriSecurity
} from "./native-runtime-config.mts";

test("Tauri launcher rejects separated and attached config overrides", () => {
  for (const argument of ["--config", "--config={}", "-c", "-c{}", "-c={}"]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./run-tauri.mjs", import.meta.url)), "build", argument],
      { encoding: "utf8" }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Security config is owned by the Tauri launcher/);
  }
});

test("native API origins fail closed in production and CI", () => {
  for (const platform of ["mobile", "desktop"]) {
    assert.equal(
      nativeApiOrigin({ VITE_API_URL: "https://api.example.invalid" }, platform, false),
      "https://api.example.invalid"
    );
    for (const value of [
      undefined,
      "",
      "http://localhost:3001",
      "https://*.example.com",
      "https://user:pass@example.com",
      "https://example.com/",
      "https://example.com?q=1",
      "https://example.com#fragment",
      "file:///test",
      "https://example.com:443"
    ]) {
      assert.throws(() => nativeApiOrigin({ VITE_API_URL: value }, platform, false));
      assert.throws(() => nativeApiOrigin({ VITE_API_URL: value, CI: "true" }, platform, false));
    }
    assert.throws(() =>
      nativeApiOrigin(
        {
          VITE_API_URL: "https://api.example.invalid",
          CI: "true",
          NATIVE_ALLOW_INSECURE_API: "true"
        },
        platform,
        true
      )
    );
    assert.throws(() =>
      nativeApiOrigin({ VITE_API_URL: "http://localhost:3001", CI: "true" }, platform, true)
    );
  }
  assert.equal(
    nativeApiOrigin({ VITE_API_URL: "http://localhost:3001" }, "desktop", true),
    "http://localhost:3001"
  );
  assert.throws(() => nativeApiOrigin({ VITE_API_URL: "http://localhost:3001" }, "mobile", true));
  assert.equal(
    nativeApiOrigin(
      { VITE_API_URL: "http://localhost:3001", NATIVE_ALLOW_INSECURE_API: "true" },
      "mobile",
      true
    ),
    "http://localhost:3001"
  );
});

test("Capacitor live reload requires both flags and local development", () => {
  const flags = { CAP_LIVE_RELOAD: "true", CAP_SERVER_URL: "http://192.168.1.10:1421" };
  for (const env of [
    flags,
    { ...flags, NODE_ENV: "production" },
    { ...flags, NODE_ENV: "development", CI: "true" },
    { CAP_LIVE_RELOAD: "true" },
    { CAP_SERVER_URL: flags.CAP_SERVER_URL }
  ])
    assert.throws(() => capacitorServer(env));
  assert.deepEqual(capacitorServer({ ...flags, NODE_ENV: "development" }).allowNavigation, [
    "192.168.1.10"
  ]);
  assert.throws(() => exactHttpOrigin("http://*.example.com", "CAP_SERVER_URL"));
  const httpApi = {
    NODE_ENV: "development",
    NATIVE_ALLOW_INSECURE_API: "true",
    VITE_API_URL: "http://192.168.1.10:3001"
  };
  assert.equal(capacitorServer(httpApi).cleartext, true);
  assert.equal(capacitorServer(httpApi).url, undefined);
  assert.throws(() => capacitorServer({ ...httpApi, NODE_ENV: "production" }));
  assert.throws(() => capacitorServer({ ...httpApi, CI: "true" }));
  assert.equal(capacitorServer({}).cleartext, undefined);
});

test("production configuration fixes every packaged native origin", async () => {
  const tauri = JSON.parse(
    await readFile(new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8")
  );
  const server = capacitorServer({});
  const config = { webDir: "dist", server };
  assert.deepEqual(checkNativeConfiguration(tauri, config), []);
  assert.ok(
    checkNativeConfiguration(tauri, { ...config, android: { allowMixedContent: true } }).length
  );
  // Capacitor 8 server schemes; Tauri 2 custom protocol mapping (useHttpsScheme=false).
  const origins = {
    "Capacitor iOS": `${server.iosScheme}://${server.hostname}`,
    "Capacitor Android": `${server.androidScheme}://${server.hostname}`,
    "Tauri Windows": `${tauri.app.windows[0].useHttpsScheme ? "https" : "http"}://tauri.localhost`,
    "Tauri macOS": "tauri://localhost",
    "Tauri Linux": "tauri://localhost"
  };
  assert.deepEqual(origins, {
    "Capacitor iOS": "capacitor://localhost",
    "Capacitor Android": "https://localhost",
    "Tauri Windows": "http://tauri.localhost",
    "Tauri macOS": "tauri://localhost",
    "Tauri Linux": "tauri://localhost"
  });
  assert.ok(
    checkNativeConfiguration(tauri, {
      ...config,
      server: { ...server, url: "https://example.com" }
    }).length
  );
  assert.ok(
    checkNativeConfiguration(
      {
        ...tauri,
        app: {
          ...tauri.app,
          security: { csp: "script-src 'self'; connect-src https://*.example.com" }
        }
      },
      config
    ).length
  );
});

test("Tauri CSP permits only the configured API, with HMR restricted to development", () => {
  const production = tauriSecurity("https://api.example.invalid", false);
  assert.match(
    production.csp,
    /connect-src 'self' https:\/\/api\.example\.invalid ipc: http:\/\/ipc\.localhost;/
  );
  assert.equal(production.devCsp, undefined);
  assert.doesNotMatch(production.csp, /\*|ws:|unsafe-eval/);
  assert.match(tauriSecurity("http://localhost:3001", true).devCsp, /ws:\/\/127\.0\.0\.1:1422/);
});
