import test from "node:test";
import assert from "node:assert/strict";

import { buildMergedConfigContent } from "../src/server/definitions/context.js";

test("buildMergedConfigContent writes prompt references as uses entries when prompt paths are provided", async () => {
  const configDoc = {
    name: "Team Config",
    version: "1.0.0",
    schema: "v1",
    prompts: [{ dcc_use: "prompts/java-review" }]
  };

  const definitionsByDccUri = new Map([
    [
      "prompts/java-review",
      {
        filePath: "/repo/prompts/java-review.md",
        content: `---\nname: Java review\ninvokable: true\n---\nReview selected Java code.`
      }
    ]
  ]);

  const merged = await buildMergedConfigContent(configDoc, definitionsByDccUri, {
    promptUsesByDccUri: new Map([["prompts/java-review", "file:///home/user/.continue/rules/team/prompts/java-review.md"]])
  });

  assert.match(merged, /prompts:\n\s+- uses: file:\/\/\/home\/user\/\.continue\/rules\/team\/prompts\/java-review\.md/);
  assert.doesNotMatch(merged, /- Review selected Java code\./);
});
