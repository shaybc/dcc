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

test("validateDefinition accepts Continue rule targeting fields in strict mode for singular rule type", () => {
  const result = validateDefinition({
    definition: {
      key: "rules/xss-protection.md",
      type: "rule",
      content: ruleMarkdown,
      filePath: "rules/xss-protection.md"
    },
    options: { strict: true, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "success");
  assert.equal(result.summary.errors, 0);
});


test("validateDefinition rejects legacy tags field in strict mode", () => {
  const legacyTagsRule = `---
name: Legacy Tags Rule
dcc_uri: sec/rules/legacy-tags
description: Rule using unsupported legacy tags field.
tags: legacy
---

Body
`;

  const result = validateDefinition({
    definition: {
      key: "rules/legacy-tags.md",
      type: "rule",
      content: legacyTagsRule,
      filePath: "rules/legacy-tags.md"
    },
    options: { strict: true, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "failure");
  assert.ok(result.checks.some((finding) => String(finding.message || "").includes("Unrecognized key(s) in object: 'tags'")));
});
