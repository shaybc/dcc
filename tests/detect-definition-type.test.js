import test from "node:test";
import assert from "node:assert/strict";

import { detectDefinitionType } from "../src/server/definitions/detectDefinitionType.js";

test("detectDefinitionType classifies markdown with invokable true as prompt", () => {
  const content = `---
name: Rephrase request
invokable: true
---
Please rewrite the user request in concise language.
`;

  assert.equal(detectDefinitionType(content, "prompts/rephrase.md"), "prompt");
});

test("detectDefinitionType classifies markdown without invokable true as rule", () => {
  const content = `---
name: Keep answers concise
invokable: false
---
- Keep responses short and direct.
`;

  assert.equal(detectDefinitionType(content, "rules/concise.md"), "rule");
});

test("detectDefinitionType treats markdown frontmatter as rule when invokable is missing", () => {
  const content = `---
name: Safety guidance
---
Always verify risky commands.
`;

  assert.equal(detectDefinitionType(content, "definitions/safety.md"), "rule");
});
