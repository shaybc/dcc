import test from "node:test";
import assert from "node:assert/strict";

import { parseDefinitionContent } from "../src/server/definitions/parse.js";
import { sanitizeYamlHeaderScalars, sanitizeMarkdownFrontmatterHeaderScalars, updateDefinitionMetadataInContent } from "../src/server/definitions/content.js";

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

test("parseDefinitionContent maps doc dcc_definition_type to internal type even if parser fallback is needed", () => {
  const content = `name: C# Docs
dcc_uri: dev/docs/csharp_docs
version: "1.0"
schema: v1
description: Official C# language documentation and .NET API reference
dcc_definition_type: doc
dcc_tags:
  - backend
  - csharp
  - dotnet
docs:
  - name: C# Language Reference
    startUrl: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/
  - name: .NET API Browser
    startUrl: https://learn.microsoft.com/en-us/dotnet/api/
`;

  const parsed = parseDefinitionContent(content, "docs/csharp-docs.yaml");
  assert.equal(parsed.dccDefinitionType, "doc");
  assert.equal(parsed.type, "doc");
  assert.equal(parsed.key, "docs::dev/docs/csharp_docs");
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

test("sanitizeYamlHeaderScalars preserves inline hash in unquoted values", () => {
  const raw = "name: C# Docs\ndescription: Official C# language docs\n";
  const sanitized = sanitizeYamlHeaderScalars(raw);

  assert.match(sanitized, /^name:\s+"C# Docs"/m);
  assert.match(sanitized, /^description:\s+"Official C# language docs"/m);
});

test("sanitizeYamlHeaderScalars preserves multiline block style metadata", () => {
  const raw = `description: |\n  line one\n  line two\nname: Debugging rules\n`;
  const sanitized = sanitizeYamlHeaderScalars(raw);

  assert.match(sanitized, /^description:\s+\|/m);
  assert.match(sanitized, /^name:\s+"Debugging rules"/m);
});

test("sanitizeMarkdownFrontmatterHeaderScalars only sanitizes frontmatter header", () => {
  const raw = `---\nname: Debugging rules\ndescription: A description: with colon\n---\n\n# Title\nBody: should stay untouched\n`;
  const sanitized = sanitizeMarkdownFrontmatterHeaderScalars(raw);

  assert.match(sanitized, /^---\nname:\s+"Debugging rules"\ndescription:\s+"A description: with colon"\n---/m);
  assert.match(sanitized, /Body: should stay untouched/);
});


test("updateDefinitionMetadataInContent emits multiline block style for YAML description", () => {
  const original = `name: Original
description: short description
dcc_uri: rules/original
`;
  const updated = updateDefinitionMetadataInContent(original, "rules/new-rule.yaml", { name: "Updated" });

  assert.match(updated, /^description:\s*\|-/m);
  assert.match(updated, /^\s+short description$/m);
});

test("updateDefinitionMetadataInContent emits multiline block style for markdown frontmatter description", () => {
  const original = `---
name: Original
description: short description
dcc_uri: rules/original
---

# Body
`;
  const updated = updateDefinitionMetadataInContent(original, "rules/new-rule.md", { name: "Updated" });

  assert.match(updated, /^description:\s*\|-/m);
  assert.match(updated, /^\s+short description$/m);
});


test("updateDefinitionMetadataInContent normalizes description chomp indicator to strip", () => {
  const original = `name: Original
description: |
  line one
  line two
`;
  const updated = updateDefinitionMetadataInContent(original, "rules/new-rule.yaml", { name: "Updated" });

  assert.match(updated, /^description:\s*\|-/m);
});
