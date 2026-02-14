import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import fs from "fs/promises";
import http from "http";
import express from "express";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-route-tests-"));
process.env.DCC_DB_PATH = path.join(tempRoot, "dcc.sqlite");

const { default: definitionsRouter } = await import("../src/server/routes/definitions.js");
const { runDb } = await import("../src/server/db/helpers.js");

async function withServer(handler) {
  const app = express();
  app.use(definitionsRouter);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await handler(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function resetTables() {
  await runDb("DELETE FROM settings");
  await runDb("DELETE FROM dev_projects");
  await runDb("DELETE FROM definitions");
}

test("GET /api/definitions/suggestions returns response shape with reasons", async () => {
  await resetTables();
  await runDb("INSERT INTO settings (key, value) VALUES (?, ?)", ["currentDevProject", "/workspace/apps/node-service"]);
  await runDb("INSERT INTO dev_projects (path, projectType, corePlatform, detectedSignals, projectTechnologies, lastScannedAt) VALUES (?, ?, ?, ?, ?, ?)", [
    "/workspace/apps/node-service",
    "node",
    "backend",
    "[]",
    JSON.stringify(["node", "javascript", "frontend", "html"]),
    new Date().toISOString()
  ]);
  await runDb("INSERT INTO definitions (key, name, description, tags, type) VALUES (?, ?, ?, ?, ?)", [
    "configs::node-eslint",
    "Node linting",
    "eslint and jest defaults",
    "eslint,node",
    "configs"
  ]);

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/definitions/suggestions`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.projectPath, "/workspace/apps/node-service");
    assert.equal(payload.projectType, "node");
    assert.equal(payload.corePlatform, "backend");
    assert.ok(Array.isArray(payload.suggestions));
    assert.ok(payload.suggestions.length > 0);
    assert.equal(typeof payload.suggestions[0].definitionId, "number");
    assert.equal(typeof payload.suggestions[0].score, "number");
    assert.ok(Array.isArray(payload.suggestions[0].reasons));
    assert.ok(Array.isArray(payload.projectTechnologies));
    assert.ok(payload.projectTechnologies.includes("javascript"));
  });
});

test("GET /api/definitions/suggestions handles no current project", async () => {
  await resetTables();

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/definitions/suggestions`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.deepEqual(payload, {
      projectPath: "",
      projectType: "",
      corePlatform: "",
      projectTechnologies: [],
      suggestions: []
    });
  });
});

test("GET /api/definitions/suggestions handles missing project metadata", async () => {
  await resetTables();
  await runDb("INSERT INTO settings (key, value) VALUES (?, ?)", ["currentDevProject", "/workspace/apps/missing"]);

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/definitions/suggestions`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.deepEqual(payload, {
      projectPath: "/workspace/apps/missing",
      projectType: "",
      corePlatform: "",
      projectTechnologies: [],
      suggestions: []
    });
  });
});


test("GET /api/definitions/suggestions respects maxRecommendedDefinitions setting", async () => {
  await resetTables();
  await runDb("INSERT INTO settings (key, value) VALUES (?, ?)", ["currentDevProject", "/workspace/apps/node-service"]);
  await runDb("INSERT INTO settings (key, value) VALUES (?, ?)", ["maxRecommendedDefinitions", "5"]);
  await runDb("INSERT INTO dev_projects (path, projectType, corePlatform, detectedSignals, projectTechnologies, lastScannedAt) VALUES (?, ?, ?, ?, ?, ?)", [
    "/workspace/apps/node-service",
    "node",
    "backend",
    "[]",
    JSON.stringify(["node", "javascript"]),
    new Date().toISOString()
  ]);

  for (let index = 1; index <= 12; index += 1) {
    await runDb("INSERT INTO definitions (key, name, description, tags, type) VALUES (?, ?, ?, ?, ?)", [
      `rules::node-${index}`,
      `Node Rule ${index}`,
      "Node backend helper",
      "node,backend",
      "rules"
    ]);
  }

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/definitions/suggestions`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.suggestions.length, 5);
  });
});
