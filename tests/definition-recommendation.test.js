import test from "node:test";
import assert from "node:assert/strict";

import { recommendDefinitions } from "../src/server/definitions/recommend.js";

test("recommendDefinitions boosts relevant definitions for single-type projects", () => {
  const definitions = [
    {
      id: 1,
      key: "configs::node-eslint",
      name: "Node eslint baseline",
      description: "eslint and jest defaults for npm projects",
      type: "configs",
      tags: "node,eslint"
    },
    {
      id: 2,
      key: "prompts::generic",
      name: "Generic prompt",
      description: "catch all helper",
      type: "prompts",
      tags: "misc"
    }
  ];

  const suggestions = recommendDefinitions("/work/apps/node-service", "node", definitions);

  assert.equal(suggestions[0].key, "configs::node-eslint");
  assert.ok(suggestions[0].score > suggestions[1].score);
  assert.ok(suggestions[0].reasons.some((reason) => reason.includes("definition type boost: configs")));
});

test("recommendDefinitions supports polyglot project hints via project path tokens", () => {
  const definitions = [
    {
      id: 1,
      key: "workflows::python-quality",
      name: "Python quality workflow",
      description: "ruff and pytest checks",
      type: "workflows",
      tags: "python"
    },
    {
      id: 2,
      key: "workflows::node-quality",
      name: "Node quality workflow",
      description: "eslint and jest checks",
      type: "workflows",
      tags: "node"
    }
  ];

  const suggestions = recommendDefinitions("/work/polyglot/python/node/monorepo", "node", definitions);

  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.some((item) => item.reasons.some((reason) => reason.includes("project path keyword: python"))));
  assert.equal(suggestions[0].key, "workflows::node-quality");
});

test("recommendDefinitions returns no suggestions for unknown projects", () => {
  const definitions = [
    { key: "configs::a", name: "A", description: "plain", type: "configs", tags: "" }
  ];

  const suggestions = recommendDefinitions("/work/random", "unknown", definitions);
  assert.deepEqual(suggestions, []);
});

test("recommendDefinitions breaks ties deterministically by name and key", () => {
  const definitions = [
    { key: "rules::2", name: "Zulu", description: "python helper", type: "rules", tags: "" },
    { key: "rules::1", name: "Alpha", description: "python helper", type: "rules", tags: "" },
    { key: "rules::3", name: "Alpha", description: "python helper", type: "rules", tags: "" }
  ];

  const suggestions = recommendDefinitions("/tmp/python", "python", definitions);

  assert.deepEqual(suggestions.map((item) => item.key), ["rules::1", "rules::3", "rules::2"]);
});
