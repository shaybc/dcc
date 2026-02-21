import test from "node:test";
import assert from "node:assert/strict";

import { detectDefinitionType } from "../src/server/definitions/detectDefinitionType.js";
import { validateDefinition } from "../src/server/definitions/validateDefinition.js";

test("detectDefinitionType requires dcc_definition_type field", () => {
  const content = `name: Legacy Config\ndcc_uri: misc/legacy\ndescription: legacy\ndcc:\n  config_type: ide\n`;

  assert.equal(detectDefinitionType(content, "misc/legacy.yaml"), "");
});

test("validateDefinition rejects legacy dcc object in strict mode for configs", () => {
  const content = `name: Team IDE Config\ndcc_uri: configs/team-ide\ndcc_definition_type: config\ndescription: IDE config\ndcc_config_type: ide\ndcc:\n  config_type: ide\n`;

  const result = validateDefinition({
    definition: {
      key: "configs/team-ide.yaml",
      type: "config",
      content,
      filePath: "configs/team-ide.yaml"
    },
    options: { strict: true, lint: false, references: false },
    knownDefinitions: []
  });

  assert.equal(result.status, "failure");
  assert.ok(result.checks.some((finding) => String(finding.message || "").includes("Unrecognized key(s) in object: 'dcc'")));
});
