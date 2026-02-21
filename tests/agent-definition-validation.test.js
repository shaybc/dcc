import test from "node:test";
import assert from "node:assert/strict";

import { validateDefinition } from "../src/server/definitions/validateDefinition.js";

test("validateDefinition accepts local markdown agent schema without dcc_uri", () => {
  const content = `---
name: Conventional Title
description: Updates PR title to follow conventional commit format
model: claude-3-7-sonnet
rules:
  - rules/conventional-commits
mcpServers:
  - mcpservers/github
---

You are reviewing a pull request.`;

  const result = validateDefinition({
    definition: {
      key: "agents/conventional-title.md",
      type: "agent",
      content,
      filePath: "agents/conventional-title.md"
    },
    options: { strict: true, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "success");
  assert.equal(result.summary.errors, 0);
});

test("validateDefinition requires description for local markdown agent schema", () => {
  const content = `---
name: Conventional Title
---

You are reviewing a pull request.`;

  const result = validateDefinition({
    definition: {
      key: "agents/conventional-title.md",
      type: "agent",
      content,
      filePath: "agents/conventional-title.md"
    },
    options: { strict: true, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "failure");
  assert.ok(result.checks.some((finding) => finding.path === "description"));
});
