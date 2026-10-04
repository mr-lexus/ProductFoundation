import { spawnSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function needsExtendedNative(event, files) {
  if (["schedule", "workflow_dispatch"].includes(event)) return true;
  if (event !== "pull_request") return false;
  return files.some((file) =>
    /^(?:apps\/(?:web|mobile|desktop)\/|apps\/api\/src\/app\/(?:config|http)\/|packages\/(?:frontend-app|contracts|rpc|rpc-client|config)\/|scripts\/|\.github\/workflows\/|(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|AGENTS\.md|\.env\.example)$)/.test(
      file
    )
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  let files = [];
  if (process.env.CI_EVENT_NAME === "pull_request") {
    const base = process.env.CI_BASE_SHA;
    if (!base || !/^[a-f0-9]{40}$/.test(base)) throw new Error("Expected a PR base commit SHA.");
    const diff = spawnSync("git", ["diff", "--name-only", "-z", base, "HEAD"], {
      encoding: "utf8"
    });
    if (diff.status !== 0)
      throw new Error("Could not determine changed files; refusing to skip native checks.");
    files = diff.stdout.split("\0").filter(Boolean);
  }
  const result = needsExtendedNative(process.env.CI_EVENT_NAME, files);
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
  await appendFile(process.env.GITHUB_OUTPUT, `native=${result}\n`);
}
