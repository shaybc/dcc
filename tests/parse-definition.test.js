import test from "node:test";
import assert from "node:assert/strict";

import { parseDefinitionContent } from "../src/server/definitions/parse.js";
import { sanitizeYamlHeaderScalars } from "../src/server/definitions/content.js";

test("parseDefinitionContent exposes dccUri when provided", () => {
  const parsed = parseDefinitionContent("name: Test\ndcc_uri: prompts/my-prompt\ndcc_definition_type: prompt\n", "prompts/test.yaml");
  assert.equal(parsed.dccUri, "prompts/my-prompt");
});

test("parseDefinitionContent sets empty dccUri when missing", () => {
  const parsed = parseDefinitionContent("# README", "README.md");
  assert.equal(parsed.dccUri, "");
});


test("parseDefinitionContent ignores legacy tags field", () => {
  const parsed = parseDefinitionContent("name: Test\ndcc_uri: prompts/my-prompt\ntags: legacy\n", "prompts/test.yaml");
  assert.equal(parsed.tags, "");
});


test("parseDefinitionContent sets empty type when dcc_definition_type is missing", () => {
  const parsed = parseDefinitionContent("name: Test\ndcc_uri: prompts/my-prompt\n", "prompts/test.yaml");
  assert.equal(parsed.type, "");
});

test("parseDefinitionContent parses markdown frontmatter with unquoted colon in description", () => {
  const content = `---
name: Debugging rules
dcc_uri: dev/rules/debugging-rules
description: Minimal, high-signal rules for effective debugging: reproduce, isolate, test hypotheses, and verify fixes during debugging tasks.
version: '1.0.0'
dcc_definition_type: rule
dcc_tags:
  - dev
  - debug
---

# Debugging Rules
`;

  const parsed = parseDefinitionContent(content, "rules/debugging_rules.md");
  assert.equal(parsed.dccUri, "dev/rules/debugging-rules");
  assert.equal(parsed.dccDefinitionType, "rule");
  assert.equal(parsed.type, "rule");
  assert.equal(parsed.name, "Debugging rules");
});

test("sanitizeYamlHeaderScalars quotes one-line allowlisted metadata values", () => {
  const raw = `name: Debugging rules\nversion: 1.0.0\nschema: v1\ndescription: Minimal rules\n`;
  const sanitized = sanitizeYamlHeaderScalars(raw);

  assert.match(sanitized, /^name:\s+"Debugging rules"/m);
  assert.match(sanitized, /^version:\s+"1.0.0"/m);
  assert.match(sanitized, /^schema:\s+"v1"/m);
  assert.match(sanitized, /^description:\s+"Minimal rules"/m);
});
