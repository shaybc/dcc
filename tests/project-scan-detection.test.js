import test from "node:test";
import assert from "node:assert/strict";
import path from "path";

const fixturesRoot = path.resolve("tests/fixtures/project-scan");

test("scanDevProjects detects project types from ecosystem marker fixtures", async () => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.PROJECT_SCAN_AI_ENABLED = "false";

  const { scanDevProjects } = await import("../src/server/projects/scan.js");
  const projects = await scanDevProjects([fixturesRoot]);
  const byName = new Map(projects.map((project) => [path.basename(project.path), project]));

  const expectedTypes = {
    node: "node",
    angular: "angular",
    python: "python",
    springboot: "springboot",
    go: "go",
    rust: "rust",
    dotnet: "dotnet",
    swiftui: "swiftui",
    android: "android",
    cpp: "c++",
    "json-only": "json",
    unknown: "unknown"
  };

  for (const [fixtureName, expectedType] of Object.entries(expectedTypes)) {
    const project = byName.get(fixtureName);
    assert.ok(project, `expected fixture ${fixtureName} to be discovered`);
    assert.equal(project.projectType, expectedType, `expected ${fixtureName} to detect as ${expectedType}`);
    assert.ok(Array.isArray(project.detectedSignals));
    assert.ok(Array.isArray(project.projectTechnologies));
  }
});
