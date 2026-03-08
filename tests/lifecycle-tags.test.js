import test from "node:test";
import assert from "node:assert/strict";

import { applyTagsToDefinitionContent } from "../src/server/routes/lifecycle.js";

test("applyTagsToDefinitionContent keeps YAML description as |- while updating tags", () => {
  const source = `name: Sample
description: single line description
dcc_tags: old
`;
  const updated = applyTagsToDefinitionContent(source, "rules/sample.yaml", ["new-tag"]);

  assert.match(updated, /^description:\s*\|-/m);
  assert.match(updated, /^dcc_tags:\n\s*- new-tag/m);
});

test("applyTagsToDefinitionContent keeps markdown frontmatter description as |- while updating tags", () => {
  const source = `---
name: Sample
description: single line description
dcc_tags:
  - old
---

# Body
`;
  const updated = applyTagsToDefinitionContent(source, "rules/sample.md", ["new-tag"]);

  assert.match(updated, /^description:\s*\|-/m);
  assert.match(updated, /^dcc_tags:\n\s*- new-tag/m);
});
