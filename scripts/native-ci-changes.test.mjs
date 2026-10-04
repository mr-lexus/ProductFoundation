import assert from "node:assert/strict";
import test from "node:test";
import { needsExtendedNative } from "./native-ci-changes.mjs";

test("extended native CI covers relevant PRs and all scheduled/manual runs", () => {
  for (const file of [
    "apps/mobile/src/main.tsx",
    "apps/desktop/src-tauri/Cargo.lock",
    "apps/web/pwa.config.ts",
    "packages/frontend-app/src/index.ts",
    "packages/rpc-client/package.json",
    "apps/api/src/app/config/load-api-config.ts",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "scripts/run-tauri.mjs",
    ".github/workflows/ci.yml"
  ]) {
    assert.equal(needsExtendedNative("pull_request", [file]), true, file);
  }
  assert.equal(
    needsExtendedNative("pull_request", ["README.md", "apps/api/migrations/example.sql"]),
    false
  );
  assert.equal(needsExtendedNative("schedule", []), true);
  assert.equal(needsExtendedNative("workflow_dispatch", []), true);
  assert.equal(needsExtendedNative("push", ["apps/web/src/main.tsx"]), false);
});
