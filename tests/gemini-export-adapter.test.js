import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { GeminiAdapter } from "../src/server/definitions/export/adapters/geminiAdapter.js";

const fixturePromptPath = "tests/fixtures/definitions/prompts/code-review.md";
const fixtureRulePath = "tests/fixtures/definitions/rules/documentation-standards.md";

test("gemini adapter converts rules and prompts to expected managed paths", async () => {
  const adapter = new GeminiAdapter();
  const promptContent = await fs.readFile(fixturePromptPath, "utf8");
  const ruleContent = await fs.readFile(fixtureRulePath, "utf8");

  const ruleArtifact = adapter.convertDefinition({
    type: "rules",
    dccUri: "rules/documentation-standards",
    version: "1.0.0",
    content: ruleContent
  });
  const promptArtifact = adapter.convertDefinition({
    type: "prompts",
    dccUri: "prompts/code-review",
    version: "1.0.0",
    content: promptContent
  });

  assert.equal(ruleArtifact.relativePath, ".gemini/instructions.md");
  assert.equal(ruleArtifact.mergeStrategy, "dcc_marked_block");
  assert.equal(promptArtifact.relativePath, ".gemini/commands/prompts-code-review.md");
  assert.equal(promptArtifact.mergeStrategy, "replace_file");
});

test("gemini remove plan retracts only DCC-managed files/sections", () => {
  const adapter = new GeminiAdapter();

  assert.deepEqual(adapter.getRemovePlan({
    type: "rules",
    dccUri: "rules/documentation-standards"
  }), [{
    op: "remove_marked_block",
    relativePath: ".gemini/instructions.md",
    markers: {
      start: "<!-- DCC:BEGIN rules/documentation-standards -->",
      end: "<!-- DCC:END rules/documentation-standards -->"
    }
  }]);

  assert.deepEqual(adapter.getRemovePlan({
    type: "prompts",
    dccUri: "prompts/code-review"
  }), [{
    op: "delete_file",
    relativePath: ".gemini/commands/prompts-code-review.md"
  }]);
});
