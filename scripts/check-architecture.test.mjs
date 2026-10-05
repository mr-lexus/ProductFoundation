import assert from "node:assert/strict";
import test from "node:test";
import {
  frontendFsdImportViolation,
  frontendImportViolation,
  frontendSourceViolation
} from "./frontend-boundaries.mjs";
import { readImports } from "./read-imports.mjs";

test("platform boundaries reject imports, reexports, dynamic imports and manifest dependencies", () => {
  for (const dependency of [
    "@capacitor/core",
    "@tauri-apps/api/core",
    "virtual:pwa-register/react",
    "vite-plugin-pwa",
    "workbox-window",
    "@app/web"
  ]) {
    for (const source of [
      `import x from '${dependency}'`,
      `export * from '${dependency}'`,
      `import('${dependency}')`
    ]) {
      const imports = readImports(source);
      assert.equal(imports.length, 1);
      assert.ok(
        frontendImportViolation("packages/frontend-app/src/shared/api/client.ts", imports[0])
      );
    }
    assert.ok(frontendImportViolation("packages/config/package.json", dependency));
  }
  assert.ok(frontendImportViolation("apps/mobile/src/main.tsx", "../../web/src/main"));
  assert.ok(frontendImportViolation("apps/desktop/package.json", "@app/mobile"));
  assert.ok(frontendImportViolation("apps/api/package.json", "@capacitor/core"));
  assert.equal(frontendImportViolation("apps/mobile/src/main.tsx", "@capacitor/core"), undefined);
  assert.equal(frontendImportViolation("apps/desktop/src/main.tsx", "@tauri-apps/api"), undefined);
  assert.equal(frontendImportViolation("apps/web/src/pwa.ts", "virtual:pwa-register"), undefined);
  assert.equal(frontendImportViolation("apps/mobile/src/main.tsx", "@app/frontend-app"), undefined);
});

test("shared/native source cannot register a worker or read frontend build settings", () => {
  assert.ok(
    frontendSourceViolation(
      "apps/mobile/src/main.tsx",
      "navigator.serviceWorker.register('/sw.js')"
    )
  );
  assert.ok(
    frontendSourceViolation(
      "packages/frontend-app/src/shared/config.ts",
      "import.meta.env.VITE_API_URL"
    )
  );
  assert.equal(
    frontendSourceViolation("apps/web/src/main.tsx", "navigator.serviceWorker"),
    undefined
  );
});

test("FSD boundaries cannot be bypassed by conventional or package self aliases", () => {
  const source = "packages/frontend-app/src/entities/system/model/status.ts";
  for (const specifier of [
    "../../../features/system-ping",
    "@/features/system-ping",
    "@app/frontend-app/src/features/system-ping"
  ]) {
    assert.match(frontendFsdImportViolation(source, specifier) ?? "", /points upward/);
  }

  const page = "packages/frontend-app/src/pages/foundation-status/ui/page.tsx";
  for (const specifier of [
    "../../../entities/system/model/system-status",
    "@/entities/system/model/system-status",
    "@app/frontend-app/entities/system/model/system-status"
  ]) {
    assert.match(frontendFsdImportViolation(page, specifier) ?? "", /public API/);
  }

  assert.equal(frontendFsdImportViolation(page, "@/entities/system"), undefined);
  assert.equal(
    frontendFsdImportViolation(
      "packages/frontend-app/src/entities/system/model/status.ts",
      "@/entities/system/model/normalize"
    ),
    undefined
  );
});
