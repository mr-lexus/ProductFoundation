import assert from "node:assert/strict";
import test from "node:test";
import { readImports } from "./read-imports.mjs";

test("architecture import reader handles ESM, dynamic, require and type imports", () => {
  const source = `
    import value from "static-package";
    import "side-effect-package";
    export { value } from "exported-package";
    const lazy = import("dynamic-package");
    const legacy = require("required-package");
    type Remote = import("typed-package").Remote;
    // import ignored from "comment-package";
    const text = 'import ignored from "string-package"';
  `;
  assert.deepEqual(readImports(source).sort(), [
    "dynamic-package",
    "exported-package",
    "required-package",
    "side-effect-package",
    "static-package",
    "typed-package"
  ]);
});
