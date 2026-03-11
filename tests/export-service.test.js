import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { exportDefinitionsToDestination } from "../src/server/definitions/export/exportService.js";
import { DESTINATIONS } from "../src/server/definitions/export/compatibility.js";

const fixturePromptPath = "tests/fixtures/definitions/prompts/code-review.md";
const fixtureRulePath = "tests/fixtures/definitions/rules/documentation-standards.md";

test("unsupported types are skipped with explicit reason during export", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-skip-"));
  const [promptContent, ruleContent] = await Promise.all([
    fs.readFile(fixturePromptPath, "utf8"),
    fs.readFile(fixtureRulePath, "utf8")
  ]);

  const result = await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [
      { type: "context", dccUri: "context/team-context", content: promptContent },
      { type: "mcpservers", dccUri: "mcpservers/company-mcp", content: ruleContent }
    ],
    mode: "install"
  });

  assert.equal(result.writtenFiles.length, 0);
  assert.equal(result.skipped.length, 2);
  assert.deepEqual(result.skipped.map((item) => item.reason), [
    "unsupported_type_for_destination",
    "unsupported_type_for_destination"
  ]);
});

test("re-export updates existing managed prompt file without duplicating content", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-prompt-"));
  const expectedPromptPath = path.join(projectPath, ".github", "prompts", "prompts-code-review.prompt.md");

  const firstExport = await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{ type: "prompts", dccUri: "prompts/code-review", content: "first version" }],
    mode: "install"
  });

  const secondExport = await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{ type: "prompts", dccUri: "prompts/code-review", content: "second version" }],
    mode: "install"
  });

  const promptPath = secondExport.writtenFiles[0]?.filePath || firstExport.writtenFiles[0]?.filePath;
  assert.equal(promptPath, expectedPromptPath);
  const updated = await fs.readFile(promptPath, "utf8");

  assert.equal((updated.match(/^# Prompt$/gm) || []).length, 1);
  assert.match(updated, /second version/);
  assert.doesNotMatch(updated, /first version/);
});

test("copilot prompt exports derive unique file paths from definition keys", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-prompt-keys-"));

  const result = await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [
      { key: "prompts::prompts/code-review", type: "prompts", content: "review prompt" },
      { key: "prompts::prompts/bug-triage", type: "prompts", content: "triage prompt" }
    ],
    mode: "install"
  });

  assert.equal(result.writtenFiles.length, 2);

  const relativePaths = result.writtenFiles.map((entry) => entry.relativePath).sort();
  assert.deepEqual(relativePaths, [
    path.join(".github", "prompts", "prompts-bug-triage.prompt.md"),
    path.join(".github", "prompts", "prompts-code-review.prompt.md")
  ]);

  const reviewPath = path.join(projectPath, ".github", "prompts", "prompts-code-review.prompt.md");
  const triagePath = path.join(projectPath, ".github", "prompts", "prompts-bug-triage.prompt.md");

  assert.match(await fs.readFile(reviewPath, "utf8"), /review prompt/);
  assert.match(await fs.readFile(triagePath, "utf8"), /triage prompt/);
});


test("remove mode retracts DCC-managed prompt content only", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-remove-"));
  const manualPath = path.join(projectPath, ".github", "copilot-instructions.md");

  await fs.mkdir(path.dirname(manualPath), { recursive: true });
  await fs.writeFile(manualPath, "# Team Instructions\n\nManual section\n", "utf8");

  await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{ type: "prompts", dccUri: "prompts/code-review", content: "managed prompt" }],
    mode: "install"
  });

  await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{ type: "prompts", dccUri: "prompts/code-review", content: "managed prompt" }],
    mode: "remove"
  });

  const promptPath = path.join(projectPath, ".github", "prompts", "prompts-code-review.prompt.md");
  await assert.rejects(() => fs.readFile(promptPath, "utf8"), { code: "ENOENT" });
  assert.equal(await fs.readFile(manualPath, "utf8"), "# Team Instructions\n\nManual section\n");
});

test("continue destination remains unaffected by export adapters", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-continue-"));
  const promptContent = await fs.readFile(fixturePromptPath, "utf8");

  const result = await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.CONTINUE,
    definitions: [{ type: "prompts", dccUri: "prompts/code-review", content: promptContent }],
    mode: "install"
  });

  assert.equal(result.writtenFiles.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, "unsupported_destination");
  assert.match(result.warnings[0], /Unsupported export destination: continue/);
});

test("copilot agent exports write markdown agent files under .github/agents", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-agent-"));

  const result = await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{
      type: "agents",
      dccUri: "agents/large-file-reviewer",
      content: "---\ndescription: 'this agent finds large files where there are more then 500 lines of code'\ntools: [execute, read]\n---\nFind all files in the current directory and its subdirectories that have more than 500 lines of code."
    }],
    mode: "install"
  });

  assert.equal(result.writtenFiles.length, 1);
  assert.equal(result.writtenFiles[0].relativePath, path.join(".github", "agents", "agents-large-file-reviewer.md"));

  const agentPath = path.join(projectPath, ".github", "agents", "agents-large-file-reviewer.md");
  const content = await fs.readFile(agentPath, "utf8");
  assert.match(content, /^---/);
  assert.match(content, /tools: \[execute, read\]/);
});

test("remove mode retracts copilot agent markdown file", async () => {
  const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-export-agent-remove-"));

  await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{
      type: "agents",
      dccUri: "agents/large-file-reviewer",
      content: "---\ndescription: 'this agent finds large files where there are more then 500 lines of code'\ntools: [execute, read]\n---\nFind all files in the current directory and its subdirectories that have more than 500 lines of code."
    }],
    mode: "install"
  });

  await exportDefinitionsToDestination({
    projectPath,
    destination: DESTINATIONS.COPILOT,
    definitions: [{
      type: "agents",
      dccUri: "agents/large-file-reviewer",
      content: "ignored"
    }],
    mode: "remove"
  });

  const agentPath = path.join(projectPath, ".github", "agents", "agents-large-file-reviewer.md");
  await assert.rejects(() => fs.readFile(agentPath, "utf8"), { code: "ENOENT" });
});
