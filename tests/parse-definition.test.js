import test from "node:test";
import assert from "node:assert/strict";

import { parseDefinitionContent } from "../src/server/definitions/parse.js";

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
