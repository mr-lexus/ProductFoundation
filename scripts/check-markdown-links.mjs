import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function withoutExamples(source) {
  let fence;
  return source
    .replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          line.slice(marker[0].length).trim() === ""
        ) {
          fence = undefined;
        }
        return " ".repeat(line.length);
      }
      if (marker) {
        fence = marker[1];
        return " ".repeat(line.length);
      }
      return line.replace(/(`+).*?\1/g, (code) => " ".repeat(code.length));
    })
    .join("\n");
}

function linkTarget(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("<")) return trimmed.slice(1, trimmed.indexOf(">"));
  return trimmed.replace(/\s+["'][^"']*["']$/, "");
}

function markdownLinks(source) {
  const prose = withoutExamples(source);
  const links = [...prose.matchAll(/!?\[([^\]\n]*)\]\((<[^>\n]+>|[^)\n]+)\)/g)].map((match) => ({
    target: linkTarget(match[2]),
    index: match.index
  }));
  const definitions = new Map();
  for (const match of prose.matchAll(/^\s{0,3}\[([^\]\n]+)\]:\s*(.+)$/gm)) {
    definitions.set(match[1].trim().toLowerCase(), linkTarget(match[2]));
  }
  for (const match of prose.matchAll(/!?\[([^\]\n]+)\](?:\[([^\]\n]*)\])?(?![(:])/g)) {
    const target = definitions.get((match[2] || match[1]).trim().toLowerCase());
    if (target) links.push({ target, index: match.index });
  }
  return links;
}

export function listMarkdownFiles(root) {
  const listed = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "*.md"],
    { cwd: root, encoding: "utf8" }
  );
  if (listed.status !== 0) {
    throw new Error(listed.stderr?.trim() || "Unable to list Markdown files.");
  }
  return [...new Set(listed.stdout.split("\0").filter(Boolean))].sort();
}

export async function checkMarkdownFiles(root, files) {
  const documents = new Map();
  for (const file of files) {
    try {
      documents.set(
        path.resolve(root, file),
        (await readFile(path.resolve(root, file), "utf8")).replace(/\r\n/g, "\n")
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const violations = [];
  for (const [absolute, source] of documents) {
    const file = path.relative(root, absolute).split(path.sep).join("/");
    const russian = file.endsWith("-RU.md");
    const counterpart = russian
      ? absolute.replace(/-RU\.md$/, ".md")
      : absolute.replace(/\.md$/, "-RU.md");
    if (!documents.has(counterpart)) {
      violations.push(`${file}: missing ${russian ? "English" : "Russian"} companion`);
    }

    const switchLink = `[${russian ? "English version" : "Русская версия"}](./${path.basename(counterpart)})`;
    const lines = source.split("\n");
    const validSwitch = /^#{1,6} .+/.test(lines[0]) && lines[1] === "" && lines[2] === switchLink;
    if (!validSwitch) {
      violations.push(`${file}: put ${switchLink} immediately after the heading and a blank line`);
    }
    const switchIndex = validSwitch ? source.indexOf(switchLink) : -1;

    for (const link of markdownLinks(source)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(link.target)) continue;
      let target;
      try {
        target = decodeURIComponent(link.target.split("#", 1)[0].split("?", 1)[0]);
      } catch {
        violations.push(`${file}: invalid encoded link ${link.target}`);
        continue;
      }
      if (!target) continue;
      const resolved = path.resolve(path.dirname(absolute), target);
      let info;
      try {
        info = await stat(resolved);
      } catch {
        violations.push(`${file}: missing local link target ${link.target}`);
        continue;
      }
      if (info.isDirectory() && documents.has(path.join(resolved, "README.md"))) {
        violations.push(
          `${file}: link to an explicit language-specific README instead of ${link.target}`
        );
      }
      if (!resolved.endsWith(".md")) continue;
      const isSwitch = resolved === counterpart && link.index === switchIndex;
      if (russian !== resolved.endsWith("-RU.md") && !isSwitch) {
        violations.push(`${file}: documentation link changes language: ${link.target}`);
      }
    }
  }
  return { violations, pageCount: documents.size };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = process.cwd();
  const { violations, pageCount } = await checkMarkdownFiles(root, listMarkdownFiles(root));
  if (violations.length > 0) {
    process.stderr.write(
      `Markdown documentation check failed:\n${violations.map((item) => `- ${item}`).join("\n")}\n`
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Markdown links and language pairs are valid: ${pageCount} pages, ${pageCount / 2} EN/RU pairs.\n`
    );
  }
}
