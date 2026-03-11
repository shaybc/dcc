import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { CopilotAdapter } from "../src/server/definitions/export/adapters/copilotAdapter.js";

const fixturePromptPath = "tests/fixtures/definitions/prompts/code-review.md";
const fixtureRulePath = "tests/fixtures/definitions/rules/documentation-standards.md";

test("copilot adapter converts rules, prompts, and agents to expected managed paths", async () => {
  const adapter = new CopilotAdapter();
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
  const agentArtifact = adapter.convertDefinition({
    type: "agents",
    dccUri: "agents/large-file-reviewer",
    version: "1.0.0",
    content: "---\ndescription: 'this agent finds large files where there are more then 500 lines of code'\ntools: [execute, read]\n---\nFind all files in the current directory and its subdirectories that have more than 500 lines of code."
  });

  assert.equal(ruleArtifact.relativePath, ".github/copilot-instructions.md");
  assert.equal(ruleArtifact.mergeStrategy, "dcc_marked_block");
  assert.equal(promptArtifact.relativePath, ".github/prompts/prompts-code-review.prompt.md");
  assert.equal(promptArtifact.mergeStrategy, "replace_file");
  assert.equal(agentArtifact.relativePath, ".github/agents/agents-large-file-reviewer.md");
  assert.equal(agentArtifact.mergeStrategy, "replace_file");
  assert.match(agentArtifact.content, /^---/);
});

test("copilot remove plan retracts only DCC-managed files/sections", () => {
  const adapter = new CopilotAdapter();

  const ruleRemovePlan = adapter.getRemovePlan({
    type: "rules",
    dccUri: "rules/documentation-standards"
  });

  assert.deepEqual(ruleRemovePlan, [{
    op: "remove_marked_block",
    relativePath: ".github/copilot-instructions.md",
    markers: {
      start: "<!-- DCC:BEGIN rules/documentation-standards -->",
      end: "<!-- DCC:END rules/documentation-standards -->"
    }
  }]);

  const promptRemovePlan = adapter.getRemovePlan({
    type: "prompts",
    dccUri: "prompts/code-review"
  });

  assert.deepEqual(promptRemovePlan, [{
    op: "delete_file",
    relativePath: ".github/prompts/prompts-code-review.prompt.md"
  }]);

  const agentRemovePlan = adapter.getRemovePlan({
    type: "agents",
    dccUri: "agents/large-file-reviewer"
  });

  assert.deepEqual(agentRemovePlan, [{
    op: "delete_file",
    relativePath: ".github/agents/agents-large-file-reviewer.md"
  }]);
});
