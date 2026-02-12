import test from "node:test";
import assert from "node:assert/strict";
import path from "path";

const fixturesRoot = path.resolve("tests/fixtures/project-scan");

test("scanDevProjects detects project types from ecosystem marker fixtures", async () => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.PROJECT_SCAN_AI_ENABLED = "false";

  const { scanDevProjects } = await import("../src/server/projects/scan.js");
  const projects = await scanDevProjects([fixturesRoot], { detectNonGitProjects: true });
  const byName = new Map(projects.map((project) => [path.basename(project.path), project]));

  const expectedTypes = {
    node: "node",
    "node-web": "node",
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
    "yaml-majority": "yaml",
    "markdown-only": "unknown",
    unknown: "unknown"
  };

  for (const [fixtureName, expectedType] of Object.entries(expectedTypes)) {
    const project = byName.get(fixtureName);
    assert.ok(project, `expected fixture ${fixtureName} to be discovered`);
    assert.equal(project.projectType, expectedType, `expected ${fixtureName} to detect as ${expectedType}`);
    assert.ok(Array.isArray(project.detectedSignals));
    assert.ok(Array.isArray(project.projectTechnologies));

    assert.ok(project.projectTechnologies.length >= 1);
    assert.ok(project.projectTechnologies.length <= 4);
  }

  const yamlProject = byName.get("yaml-majority");
  assert.ok(yamlProject?.projectTechnologies.includes("yaml"));

  const nodeWebProject = byName.get("node-web");
  assert.ok(nodeWebProject?.projectTechnologies.includes("node"));
  assert.ok(nodeWebProject?.projectTechnologies.includes("html"));
  assert.ok(nodeWebProject?.projectTechnologies.includes("javascript"));
  assert.ok(!nodeWebProject?.projectTechnologies.includes("js"));
  assert.ok(!nodeWebProject?.projectTechnologies.includes("package"));
  assert.ok(!nodeWebProject?.projectTechnologies.includes("example"));

  const markdownProject = byName.get("markdown-only");
  assert.ok(markdownProject?.projectTechnologies.includes("markdown"));
  assert.ok(!markdownProject?.projectTechnologies.includes("unknown"));
});


test("scanDevProjects skips non-git parent directories by default", async () => {
  const os = await import("os");
  const fs = await import("fs/promises");

  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-scan-root-"));
  const parent = path.join(root, "parent");
  const child = path.join(parent, "child-repo");

  await fs.mkdir(path.join(child, ".git"), { recursive: true });
  await fs.writeFile(path.join(parent, "main.yaml"), "name: parent\n", "utf8");
  await fs.writeFile(path.join(child, "package.json"), '{"name":"child"}\n', "utf8");

  const { scanDevProjects } = await import("../src/server/projects/scan.js");
  const projects = await scanDevProjects([root]);

  const byName = new Map(projects.map((project) => [path.basename(project.path), project]));
  assert.ok(byName.has("child-repo"));
  assert.ok(!byName.has("parent"));
});
