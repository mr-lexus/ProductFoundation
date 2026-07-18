import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const listed = spawnSync("git", ["ls-files", "-z", "*.md"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
if (listed.status !== 0) {
  throw new Error(listed.stderr?.trim() || "Unable to list tracked Markdown files.");
}

const violations = [];
for (const file of listed.stdout.split("\0").filter(Boolean)) {
  const source = await readFile(file, "utf8");
  const links = source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    const rawTarget = match[1]?.trim();
    if (
      rawTarget === undefined ||
      rawTarget.startsWith("#") ||
      /^(?:https?:|mailto:)/i.test(rawTarget)
    ) {
      continue;
    }
    const targetWithoutTitle = rawTarget.replace(/\s+["'][^"']*["']$/, "");
    const target = decodeURIComponent(targetWithoutTitle.split("#", 1)[0] ?? "");
    if (target.length === 0) {
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target);
    await stat(resolved).catch(() => {
      violations.push(`${file}: missing local link target ${rawTarget}`);
    });
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `Markdown link check failed:\n${violations.map((item) => `- ${item}`).join("\n")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write("Markdown local links are valid.\n");
}
