import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const forbiddenTrackedPatterns = [
  /(^|\/)\.pnpm-store\//,
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)coverage\//,
  /(^|\/)target\//,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?![^/]*example$)/
];

function gitFiles(...arguments_) {
  const result = spawnSync("git", arguments_, {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${arguments_.join(" ")} failed.`);
  }
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .map((file) => file.split(path.sep).join("/"));
}

const tracked = gitFiles("ls-files", "-z");
const ignoredTracked = new Set(gitFiles("ls-files", "-ci", "--exclude-standard", "-z"));
const violations = tracked.filter(
  (file) =>
    ignoredTracked.has(file) || forbiddenTrackedPatterns.some((pattern) => pattern.test(file))
);

if (violations.length > 0) {
  process.stderr.write("Repository hygiene check failed:\n");
  for (const file of violations.sort()) {
    process.stderr.write(`- tracked generated, ignored or local file: ${file}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Repository hygiene check passed for ${tracked.length} tracked files.\n`);
}
