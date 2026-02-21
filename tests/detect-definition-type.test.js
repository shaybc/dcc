import test from "node:test";
import assert from "node:assert/strict";

import { detectDefinitionType } from "../src/server/definitions/detectDefinitionType.js";

test("detectDefinitionType reads dcc_definition_type from markdown frontmatter", () => {
  const content = `---
name: Rephrase request
dcc_definition_type: prompt
---
Please rewrite the user request in concise language.
`;

  assert.equal(detectDefinitionType(content, "prompts/rephrase.md"), "prompt");
});

test("detectDefinitionType reads dcc_definition_type from yaml", () => {
  const content = `name: Keep answers concise
dcc_definition_type: rule\ndcc_uri: rules/concise\n`;

  assert.equal(detectDefinitionType(content, "rules/concise.yaml"), "rule");
});

test("detectDefinitionType returns empty when dcc_definition_type is missing", () => {
  const content = `---
name: Safety guidance
---
Always verify risky commands.
`;

  assert.equal(detectDefinitionType(content, "definitions/safety.md"), "");
});
