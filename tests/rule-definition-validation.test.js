import test from "node:test";
import assert from "node:assert/strict";

import { validateDefinition } from "../src/server/definitions/validateDefinition.js";

const ruleMarkdown = `---
name: XSS Protection
dcc_uri: sec/rules/xss-protection
description: Prevent XSS by relying on React escaping and enforcing CSP.
version: "1.2"
globs:
  - "**/*.{js,jsx,ts,tsx}"
regex: "dangerouslySetInnerHTML"
alwaysApply: true
---

Avoid interpolating untrusted input into raw HTML output.
`;

test("validateDefinition accepts Continue rule targeting fields in strict mode", () => {
  const result = validateDefinition({
    definition: {
      key: "rules/xss-protection.md",
      type: "rules",
      content: ruleMarkdown,
      filePath: "rules/xss-protection.md"
    },
    options: { strict: true, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "success");
  assert.equal(result.summary.errors, 0);
});
