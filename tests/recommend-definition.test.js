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

test("recommendDefinitions prioritizes core platform matches before technology and fallback", () => {
  const definitions = [
    {
      key: "rules::mobile-review",
      name: "iOS Swift & SwiftUI Rules",
      description: "Mobile review checklist",
      type: "rules",
      tags: "ios,swift,mobile"
    },
    {
      key: "rules::html",
      name: "@HTML",
      description: "Frontend html standards",
      type: "rules",
      tags: "html,frontend,web"
    },
    {
      key: "prompts::unit-test",
      name: "Unit test",
      description: "General testing guidance",
      type: "prompts",
      tags: "testing"
    }
  ];

  const suggestions = recommendDefinitions("/work/apps/node-web", "node", definitions, {
    projectTechnologies: ["node", "javascript", "html"]
  });

  assert.deepEqual(suggestions.map((item) => item.key), [
    "rules::html",
    "prompts::unit-test"
  ]);
});

test("recommendDefinitions limits fallback suggestions to 3 by default", () => {
  const definitions = [
    { key: "prompts::generic-a", name: "Generic A", description: "assistant helper", type: "prompts", tags: "misc" },
    { key: "prompts::generic-b", name: "Generic B", description: "assistant helper", type: "prompts", tags: "misc" },
    { key: "prompts::generic-c", name: "Generic C", description: "assistant helper", type: "prompts", tags: "misc" },
    { key: "prompts::generic-d", name: "Generic D", description: "assistant helper", type: "prompts", tags: "misc" },
    { key: "prompts::generic-e", name: "Generic E", description: "assistant helper", type: "prompts", tags: "misc" }
  ];

  const suggestions = recommendDefinitions("/work/apps/node-service", "node", definitions, {
    projectTechnologies: ["node"]
  });

  assert.equal(suggestions.length, 3);
});
