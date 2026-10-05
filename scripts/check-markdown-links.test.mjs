import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkMarkdownFiles, listMarkdownFiles } from "./check-markdown-links.mjs";

function pair(name, english = "", russian = "") {
  const basename = path.posix.basename(name);
  return {
    [`${name}.md`]: `# English\n\n[Русская версия](./${basename}-RU.md)\n\n${english}\n`,
    [`${name}-RU.md`]: `# Русский\n\n[English version](./${basename}.md)\n\n${russian}\n`
  };
}

async function fixture(context, contents) {
  const root = await mkdtemp(path.join(tmpdir(), "foundation-doc-links-"));
  assert.equal(path.dirname(root), path.resolve(tmpdir()));
  context.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, source] of Object.entries(contents)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), source);
  }
  return { root, files: Object.keys(contents).filter((file) => file.endsWith(".md")) };
}

test("same-language navigation, source links and language switches pass", async (context) => {
  const { root, files } = await fixture(context, {
    ...pair(
      "README",
      "[Guide](./docs/guide.md) [Source](./source.ts) [Site](https://example.com)",
      "[Руководство](./docs/guide-RU.md)"
    ),
    ...pair("docs/guide", "[Home](../README.md)", "[Начало](../README-RU.md)"),
    "source.ts": "export {};"
  });
  assert.deepEqual(await checkMarkdownFiles(root, files), { violations: [], pageCount: 4 });
});

test("a page cannot omit its translated companion", async (context) => {
  const { root, files } = await fixture(context, { "guide.md": pair("guide")["guide.md"] });
  const { violations } = await checkMarkdownFiles(root, files);
  assert.ok(violations.some((item) => item.includes("missing Russian companion")));
});

test("navigation cannot switch language in either direction, including duplicate counterpart links", async (context) => {
  const { root, files } = await fixture(context, {
    ...pair("README", "[Guide](./guide-RU.md) [Again](./README-RU.md)", "[Guide](./guide.md)"),
    ...pair("guide")
  });
  const { violations } = await checkMarkdownFiles(root, files);
  assert.equal(violations.filter((item) => item.includes("changes language")).length, 3);
});

test("the switch must be at the top and point to the same page", async (context) => {
  const contents = { ...pair("README"), ...pair("guide") };
  contents["README.md"] = contents["README.md"].replace("./README-RU.md", "./guide-RU.md");
  contents["guide.md"] = contents["guide.md"].replace(
    "# English\n\n",
    "# English\n\nIntroduction.\n\n"
  );
  const { root, files } = await fixture(context, contents);
  const { violations } = await checkMarkdownFiles(root, files);
  assert.equal(violations.filter((item) => item.includes("immediately after")).length, 2);
});

test("reference links preserve language and missing targets fail", async (context) => {
  const { root, files } = await fixture(context, {
    ...pair(
      "README",
      "[Guide][g]\n\n[g]: ./guide-RU.md",
      "[Пропущено]\n\n[Пропущено]: ./missing-RU.md"
    ),
    ...pair("guide")
  });
  const { violations } = await checkMarkdownFiles(root, files);
  assert.ok(violations.some((item) => item.includes("changes language: ./guide-RU.md")));
  assert.ok(violations.some((item) => item.includes("missing local link target ./missing-RU.md")));
});

test("documentation directory links must name the language-specific README", async (context) => {
  const { root, files } = await fixture(context, {
    ...pair("README", "[Docs](./docs)", "[Документы](./docs)"),
    ...pair("docs/README")
  });
  const { violations } = await checkMarkdownFiles(root, files);
  assert.equal(
    violations.filter((item) => item.includes("explicit language-specific README")).length,
    2
  );
});

test("examples are ignored while real images and encoded paths are checked", async (context) => {
  const examples =
    "```md\n[Missing](./example.md)\n```\n~~~md\n[Missing](./other.md)\n~~~\n`[Inline](./example.md)`\n<!-- [Comment](./example.md) -->";
  const { root, files } = await fixture(context, {
    ...pair(
      "README",
      `${examples}\n[Space](<./a file.md> "Title")\n![Image](./image.svg)`,
      "[Пробел](./a%20file-RU.md)"
    ),
    ...pair("a file"),
    "image.svg": "<svg/>"
  });
  assert.deepEqual((await checkMarkdownFiles(root, files)).violations, []);
});

test("new untracked pages are checked before commit and ignored output is excluded", async (context) => {
  const { root } = await fixture(context, {
    ...pair("README"),
    ".gitignore": "dist/\n",
    "new.md": pair("new")["new.md"],
    "dist/generated.md": "ignored output"
  });
  assert.equal(spawnSync("git", ["init", "--quiet"], { cwd: root }).status, 0);
  assert.equal(
    spawnSync("git", ["add", "README.md", "README-RU.md", ".gitignore"], { cwd: root }).status,
    0
  );
  const files = listMarkdownFiles(root);
  assert.ok(files.includes("new.md"));
  assert.ok(!files.includes("dist/generated.md"));
  assert.ok(
    (await checkMarkdownFiles(root, files)).violations.some((item) =>
      item.includes("new.md: missing Russian companion")
    )
  );
});
