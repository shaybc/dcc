import test from "node:test";
import assert from "node:assert/strict";

import { recommendDefinitions } from "../src/server/definitions/recommend.js";

test("recommendDefinitions ranks python matches and includes transparent reasons", () => {
  const definitions = [
    {
      key: "configs::python-pytest",
      name: "Pytest baseline",
      description: "Reusable pytest and ruff setup",
      type: "configs",
      tags: "python, pytest",
      dcc_config_type: "pytest"
    },
    {
      key: "configs::node-eslint",
      name: "Node linting",
      description: "eslint defaults",
      type: "configs",
      tags: "node, eslint"
    }
  ];

  const suggestions = recommendDefinitions("/work/apps/python-api", "python", definitions);

  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].key, "configs::python-pytest");
  assert.ok(suggestions[0].score > suggestions[1].score);
  assert.ok(suggestions[0].reasons.includes("tag match: pytest"));
  assert.ok(suggestions[0].reasons.includes("keyword match: pytest"));
  assert.ok(suggestions[0].reasons.includes("definition type boost: configs"));
});

test("recommendDefinitions is deterministic for ties", () => {
  const definitions = [
    { key: "rules::b", name: "Beta", description: "python helper", type: "rules", tags: "" },
    { key: "rules::a", name: "Alpha", description: "python helper", type: "rules", tags: "" }
  ];

  const firstRun = recommendDefinitions("/tmp/python", "python", definitions);
  const secondRun = recommendDefinitions("/tmp/python", "python", definitions);

  assert.deepEqual(firstRun, secondRun);
  assert.deepEqual(firstRun.map((item) => item.name), ["Alpha", "Beta"]);
});
