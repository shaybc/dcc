import test from "node:test";
import assert from "node:assert/strict";
import YAML from "yaml";

import { buildMergedConfigContent } from "../src/server/definitions/context.js";

test("buildMergedConfigContent merges prompt definitions as structured prompt objects", async () => {
  const configDoc = {
    name: "Composer Converter",
    version: "1.1",
    schema: "v1",
    description: "Config for composer conversion",
    prompts: [
      { dcc_use: "prompts/exploratory-data-analysis" }
    ]
  };

  const promptDefinition = `---
name: Exploratory Data Analysis
description: Initial data exploration and key insights
---
Fix the issue described below (or paste the error/stacktrace).

{{{ input }}}
`;

  const definitionsByDccUri = new Map([
    ["prompts/exploratory-data-analysis", { content: promptDefinition, filePath: "prompts/exploratory-data-analysis.md" }]
  ]);

  const mergedYaml = await buildMergedConfigContent(configDoc, definitionsByDccUri);
  const mergedDoc = YAML.parse(mergedYaml);

  assert.equal(mergedDoc.prompts.length, 1);
  assert.deepEqual(mergedDoc.prompts[0], {
    name: "Exploratory Data Analysis",
    description: "Initial data exploration and key insights",
    prompt: "Fix the issue described below (or paste the error/stacktrace).\n\n{{{ input }}}"
  });
});

test("buildMergedConfigContent falls back to YAML prompt field for .yaml prompt definitions", async () => {
  const configDoc = {
    prompts: [{ dcc_use: "prompts/yaml-prompt" }]
  };

  const promptDefinition = `name: YAML Prompt
description: Prompt defined in YAML
prompt: |
  Explain this function\n  with examples.
`;

  const definitionsByDccUri = new Map([
    ["prompts/yaml-prompt", { content: promptDefinition, filePath: "prompts/yaml-prompt.yaml" }]
  ]);

  const mergedYaml = await buildMergedConfigContent(configDoc, definitionsByDccUri);
  const mergedDoc = YAML.parse(mergedYaml);

  assert.deepEqual(mergedDoc.prompts, [{
    name: "YAML Prompt",
    description: "Prompt defined in YAML",
    prompt: "Explain this function\nwith examples."
  }]);
});
