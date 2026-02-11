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

test("recommendDefinitions boosts project type context beyond hardcoded keyword lists", () => {
  const definitions = [
    {
      key: "configs::node-app",
      name: "Node app baseline",
      description: "Reusable app configuration",
      type: "configs",
      tags: "node, express"
    },
    {
      key: "configs::generic",
      name: "Generic baseline",
      description: "Reusable app configuration",
      type: "configs",
      tags: "express"
    }
  ];

  const suggestions = recommendDefinitions("/work/apps/acme-api", "node", definitions);

  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].key, "configs::node-app");
  assert.ok(suggestions[0].score > suggestions[1].score);
  assert.ok(suggestions[0].reasons.includes("project technology tag: node"));
  assert.ok(suggestions[0].reasons.includes("project technology keyword: node"));
});

test("recommendDefinitions includes project path tag matches", () => {
  const definitions = [
    {
      key: "configs::acme",
      name: "Shared config",
      description: "Common defaults",
      type: "configs",
      tags: "acme, team"
    }
  ];

  const suggestions = recommendDefinitions("/work/apps/acme-portal", "node", definitions);

  assert.equal(suggestions.length, 1);
  assert.ok(suggestions[0].reasons.includes("project path tag: acme"));
});
