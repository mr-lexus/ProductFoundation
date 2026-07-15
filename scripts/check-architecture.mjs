import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const appsRoot = path.join(workspaceRoot, "apps");
const frontendRoot = path.join(workspaceRoot, "packages", "frontend-app", "src");
const apiRoot = path.join(workspaceRoot, "apps", "api", "src");
const packagesRoot = path.join(workspaceRoot, "packages");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".mjs"]);
const foundationPackages = new Set([
  "backend-core",
  "backend-postgres",
  "config",
  "rpc",
  "rpc-client",
  "rpc-server"
]);
const ignoredDirectories = new Set([
  ".git",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "target"
]);
const violations = [];

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries
      .filter((entry) => !ignoredDirectories.has(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return collectSourceFiles(entryPath);
        }

        return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
      })
  );

  return nestedFiles.flat();
}

function relativeFromWorkspace(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join("/");
}

function addViolation(filePath, message) {
  violations.push(`${relativeFromWorkspace(filePath)}: ${message}`);
}

function readImports(source) {
  const imports = [];
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    imports.push(match[1]);
  }

  const dynamicImportPattern = /(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(dynamicImportPattern)) {
    imports.push(match[1]);
  }

  return imports;
}

function resolveRelativeImport(filePath, specifier) {
  return path.resolve(path.dirname(filePath), specifier);
}

function frontendSegments(filePath) {
  return path.relative(frontendRoot, filePath).split(path.sep);
}

function checkFrontendImport(filePath, specifier) {
  if (/^@app\/(?:api|web|mobile|desktop)(?:\/|$)/.test(specifier)) {
    addViolation(filePath, `shared frontend must not depend on runtime app "${specifier}"`);
  }

  if (!specifier.startsWith(".")) {
    return;
  }

  const target = resolveRelativeImport(filePath, specifier);
  const sourceParts = frontendSegments(filePath);
  const targetParts = frontendSegments(target);
  const layers = ["shared", "entities", "features", "widgets", "pages", "app"];
  const sourceLayer = sourceParts[0];
  const targetLayer = targetParts[0];
  const sourceRank = layers.indexOf(sourceLayer);
  const targetRank = layers.indexOf(targetLayer);

  if (sourceRank === -1 || targetRank === -1) {
    return;
  }

  if (targetRank > sourceRank) {
    addViolation(filePath, `FSD dependency points upward from ${sourceLayer} to ${targetLayer}`);
  }

  const publicApiLayers = new Set(["entities", "features", "widgets", "pages"]);
  if (publicApiLayers.has(targetLayer) && targetParts.length > 2) {
    const sourceSlice = sourceParts[1];
    const targetSlice = targetParts[1];
    const staysInsideSlice = sourceLayer === targetLayer && sourceSlice === targetSlice;

    if (!staysInsideSlice) {
      addViolation(
        filePath,
        `cross-slice import "${specifier}" bypasses the ${targetLayer}/${targetSlice} public API`
      );
    }
  }
}

function checkApiImport(filePath, specifier) {
  const normalizedFile = relativeFromWorkspace(filePath);

  if (specifier === "hono" || specifier.startsWith("hono/")) {
    addViolation(filePath, `obsolete Hono import "${specifier}" is prohibited`);
  }

  const isNestTransportImport =
    specifier.startsWith("@nestjs/") || specifier === "fastify" || specifier.startsWith("fastify/");

  if (isNestTransportImport) {
    const isAllowedEdge =
      normalizedFile.includes("/src/app/") ||
      /\/src\/modules\/[^/]+\/transport\//.test(normalizedFile);

    if (!isAllowedEdge) {
      addViolation(
        filePath,
        `NestJS/Fastify import "${specifier}" leaked outside composition or transport`
      );
    }
  }

  if (specifier === "pg" || specifier.startsWith("pg/")) {
    addViolation(
      filePath,
      `PostgreSQL driver import "${specifier}" belongs in @product-foundation/backend-postgres`
    );
  }

  if (
    specifier === "prom-client" &&
    !normalizedFile.includes("/src/app/observability/") &&
    !normalizedFile.includes("/src/app/worker/")
  ) {
    addViolation(filePath, "prom-client is restricted to the observability composition edge");
  }

  if (!specifier.startsWith(".")) {
    return;
  }

  const target = resolveRelativeImport(filePath, specifier);
  const sourceParts = path.relative(apiRoot, filePath).split(path.sep);
  const targetParts = path.relative(apiRoot, target).split(path.sep);

  if (
    normalizedFile.includes("/src/shared/application/") &&
    !normalizedFile.endsWith(".test.ts") &&
    targetParts[0] === "shared" &&
    targetParts[1] === "infrastructure"
  ) {
    addViolation(filePath, `application port depends on infrastructure through "${specifier}"`);
  }
  const layers = ["shared", "modules", "app"];
  const sourceRank = layers.indexOf(sourceParts[0]);
  const targetRank = layers.indexOf(targetParts[0]);

  if (sourceRank !== -1 && targetRank > sourceRank) {
    addViolation(
      filePath,
      `backend dependency points upward from ${sourceParts[0]} to ${targetParts[0]}`
    );
  }

  if (sourceParts[0] !== "modules" || targetParts[0] !== "modules") {
    return;
  }

  const sourceModule = sourceParts[1];
  const targetModule = targetParts[1];
  if (sourceModule !== targetModule) {
    if (targetParts.length > 2) {
      addViolation(
        filePath,
        `cross-module import "${specifier}" bypasses the ${targetModule} public API`
      );
    }
    return;
  }

  const moduleLayers = ["domain", "application", "infrastructure", "transport"];
  const sourceModuleRank = moduleLayers.indexOf(sourceParts[2]);
  const targetModuleRank = moduleLayers.indexOf(targetParts[2]);
  if (sourceModuleRank !== -1 && targetModuleRank > sourceModuleRank) {
    addViolation(
      filePath,
      `module dependency points upward from ${sourceParts[2]} to ${targetParts[2]}`
    );
  }
}

async function checkFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const imports = readImports(source);
  const normalizedFile = relativeFromWorkspace(filePath);

  if (normalizedFile.startsWith("packages/")) {
    const packageName = normalizedFile.split("/")[1];

    if (foundationPackages.has(packageName)) {
      for (const specifier of imports) {
        if (specifier.startsWith("@app/")) {
          addViolation(
            filePath,
            `foundation package must not depend on product package "${specifier}"`
          );
        }
        if (
          specifier.startsWith("@nestjs/") ||
          specifier === "fastify" ||
          specifier.startsWith("fastify/") ||
          specifier === "react" ||
          specifier === "react-dom"
        ) {
          addViolation(
            filePath,
            `foundation package must remain independent of app frameworks: "${specifier}"`
          );
        }
      }
    }

    if (packageName === "backend-core") {
      for (const specifier of imports) {
        if (
          specifier === "pg" ||
          specifier.startsWith("@nestjs/") ||
          specifier === "fastify" ||
          specifier === "prom-client" ||
          specifier === "react"
        ) {
          addViolation(
            filePath,
            `backend-core must remain framework and driver free: "${specifier}"`
          );
        }
      }
    }

    for (const specifier of imports) {
      if (
        (specifier === "pg" || specifier.startsWith("pg/")) &&
        packageName !== "backend-postgres"
      ) {
        addViolation(
          filePath,
          `PostgreSQL driver is restricted to backend-postgres: "${specifier}"`
        );
      }
      if (specifier.startsWith(".")) {
        const target = resolveRelativeImport(filePath, specifier);
        const packageRoot = path.join(packagesRoot, packageName);
        if (!target.startsWith(`${packageRoot}${path.sep}`)) {
          addViolation(filePath, `relative import "${specifier}" crosses a package boundary`);
        }
      }
    }
  }

  if (filePath.startsWith(packagesRoot) && !filePath.startsWith(frontendRoot)) {
    for (const specifier of imports) {
      if (/^@app\/(?:api|web|mobile|desktop)(?:\/|$)/.test(specifier)) {
        addViolation(filePath, `package must not depend on runtime app "${specifier}"`);
      }
    }
  }

  if (filePath.startsWith(frontendRoot)) {
    for (const specifier of imports) {
      checkFrontendImport(filePath, specifier);
    }

    if (
      /\bfetch\s*\(/.test(source) &&
      !filePath.includes(`${path.sep}shared${path.sep}api${path.sep}`)
    ) {
      addViolation(filePath, "direct fetch call must live in shared/api");
    }
  }

  if (filePath.startsWith(apiRoot)) {
    for (const specifier of imports) {
      checkApiImport(filePath, specifier);
    }
  }
}

async function workspaceManifests() {
  const manifests = [];
  for (const root of [appsRoot, packagesRoot]) {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const manifestPath = path.join(root, entry.name, "package.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifests.push({
        directory: entry.name,
        manifest,
        manifestPath,
        root
      });
    }
  }
  return manifests;
}

function checkManifestBoundaries(manifests) {
  const byName = new Map(manifests.map((entry) => [entry.manifest.name, entry]));
  const graph = new Map();

  for (const entry of manifests) {
    const allDependencies = {
      ...entry.manifest.dependencies,
      ...entry.manifest.devDependencies,
      ...entry.manifest.optionalDependencies,
      ...entry.manifest.peerDependencies
    };
    const runtimeDependencies = {
      ...entry.manifest.dependencies,
      ...entry.manifest.optionalDependencies,
      ...entry.manifest.peerDependencies
    };
    const expectedPrefix =
      entry.root === appsRoot ||
      entry.directory === "contracts" ||
      entry.directory === "frontend-app"
        ? "@app/"
        : "@product-foundation/";

    if (
      typeof entry.manifest.name !== "string" ||
      !entry.manifest.name.startsWith(expectedPrefix)
    ) {
      addViolation(entry.manifestPath, `package name must use the ${expectedPrefix} namespace`);
    }

    if (foundationPackages.has(entry.directory)) {
      for (const dependency of Object.keys(allDependencies)) {
        if (dependency.startsWith("@app/")) {
          addViolation(
            entry.manifestPath,
            `foundation manifest must not depend on product package "${dependency}"`
          );
        }
      }
    }

    if (entry.root === packagesRoot) {
      for (const dependency of Object.keys(allDependencies)) {
        if (/^@app\/(?:api|web|mobile|desktop)$/.test(dependency)) {
          addViolation(
            entry.manifestPath,
            `package manifest must not depend on runtime app "${dependency}"`
          );
        }
      }
    }

    graph.set(
      entry.manifest.name,
      Object.keys(runtimeDependencies).filter((name) => byName.has(name))
    );
  }

  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  function visit(name) {
    if (visiting.has(name)) {
      const cycleStart = stack.indexOf(name);
      const cycle = [...stack.slice(cycleStart), name];
      addViolation(
        byName.get(name).manifestPath,
        `workspace dependency cycle: ${cycle.join(" -> ")}`
      );
      return;
    }
    if (visited.has(name)) {
      return;
    }
    visiting.add(name);
    stack.push(name);
    for (const dependency of graph.get(name) ?? []) {
      visit(dependency);
    }
    stack.pop();
    visiting.delete(name);
    visited.add(name);
  }

  for (const name of graph.keys()) {
    visit(name);
  }
}

const files = [
  ...(await collectSourceFiles(packagesRoot)),
  ...(await collectSourceFiles(appsRoot))
];
checkManifestBoundaries(await workspaceManifests());
await Promise.all(files.map(checkFile));

if (violations.length > 0) {
  console.error("Architecture check failed:");
  for (const violation of violations.sort()) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Architecture check passed for ${files.length} source files.`);
}
