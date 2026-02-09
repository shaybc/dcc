import test from "node:test";
import assert from "node:assert/strict";

import { detectDefinitionType } from "../src/server/definitions/detectDefinitionType.js";
import { validateDefinition } from "../src/server/definitions/validateDefinition.js";

const docYaml = `name: Continue Documentation
version: 0.0.1
schema: v1
dcc_uri: docs/continueDocs
description: this is a playwrite mcp server description
tags: tag1, tag2, tag3

docs:
  - name: Continue
    startUrl: https://docs.continue.dev/intro
    favicon: https://docs.continue.dev/favicon.ico
`;

test("detectDefinitionType identifies doc definitions", () => {
  const type = detectDefinitionType(docYaml, "docs/continue-docs.yaml");
  assert.equal(type, "doc");
});

test("validateDefinition passes for docs definition type", () => {
  const result = validateDefinition({
    definition: {
      key: "docs/continue-docs.yaml",
      type: "docs",
      content: docYaml,
      filePath: "docs/continue-docs.yaml"
    },
    options: { strict: true, lint: true, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "success");
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.warnings, 0);
});
