import test from "node:test";
import assert from "node:assert/strict";

import { validateDefinition } from "../src/server/definitions/validateDefinition.js";

test("validateDefinition accepts supported model capabilities", () => {
  const content = `name: Gemini 2.5 Flash via Shim
dcc_uri: dev/models/gemini_25_flash
dcc_definition_type: model
version: "1.3"
schema: v1
description: DCC server routing to model Gemini 2.5 Flash through an OpenAI-compatible shim
dcc_tags:
  - gemini_25_flash
models:
  - name: Gemini 2.5 Flash
    provider: openai
    model: gemini-2.5-flash
    apiBase: http://localhost:7331/v1
    roles:
      - chat
      - edit
      - apply
      - summarize
    capabilities:
      - tool_use
`;

  const result = validateDefinition({
    definition: {
      key: "dev/models/gemini_25_flash.yaml",
      type: "model",
      content,
      filePath: "dev/models/gemini_25_flash.yaml"
    },
    options: { strict: false, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "success");
  assert.equal(result.checks.some((finding) => finding.id === "schema.model.capabilities"), false);
});

test("validateDefinition rejects unsupported model capabilities", () => {
  const content = `name: Invalid Model
dcc_uri: dev/models/invalid_model
dcc_definition_type: model
description: Invalid capability test
models:
  - name: Invalid Model
    provider: openai
    model: invalid-model
    capabilities:
      - function_calling
`;

  const result = validateDefinition({
    definition: {
      key: "dev/models/invalid_model.yaml",
      type: "model",
      content,
      filePath: "dev/models/invalid_model.yaml"
    },
    options: { strict: false, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "failure");
  assert.ok(result.checks.some((finding) => finding.id === "schema.model.capabilities" && String(finding.path) === "models.0.capabilities"));
});
