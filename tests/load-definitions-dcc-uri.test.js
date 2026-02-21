import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import fs from "fs/promises";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-load-definitions-tests-"));
process.env.DCC_DB_PATH = path.join(tempRoot, "dcc.sqlite");

const { runDb, allDb } = await import("../src/server/db/helpers.js");
const { loadDefinitions } = await import("../src/server/definitions/index.js");

async function resetTables() {
  await runDb("DELETE FROM definitions");
  await runDb("DELETE FROM asset_repos");
}

test("loadDefinitions only loads files that contain dcc_uri", async () => {
  await resetTables();

  const repoRoot = path.join(tempRoot, "assets-repo");
  await fs.mkdir(repoRoot, { recursive: true });
  await fs.writeFile(path.join(repoRoot, "valid.yaml"), "name: Valid\ndcc_uri: prompts/valid\ndcc_definition_type: prompt\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Readme without metadata\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "missing-type.yaml"), "name: Missing Type\ndcc_uri: prompts/missing-type\n", "utf8");

  await runDb(
    `INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
    ["assets", "https://example.com/repo.git", repoRoot, new Date().toISOString(), new Date().toISOString()]
  );

  await runDb("DELETE FROM settings WHERE key IN ('repoUrl', 'repoPath')");

  const { execFile } = await import("node:child_process");
  const runGit = (args) => new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });

  await runGit(["init"]);
  await runGit(["add", "."]);

  const result = await loadDefinitions();

  const rows = await allDb("SELECT key, filePath, source FROM definitions ORDER BY filePath ASC");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].filePath, path.join(repoRoot, "valid.yaml"));
  assert.equal(rows[0].key, "prompts::prompts/valid");
  assert.equal(rows[0].source, "repo");

  const skippedByFile = new Map((result.skippedDefinitions || []).map((entry) => [path.basename(entry.filePath), entry.reason]));
  assert.equal(skippedByFile.get("README.md"), "not a definition file: missing both dcc_uri and dcc_definition_type metadata fields");
  assert.equal(skippedByFile.get("missing-type.yaml"), "dcc_definition_type missing (expected in definition metadata)");
});

test("loadDefinitions reports missing name for typed definition", async () => {
  await resetTables();

  const repoRoot = path.join(tempRoot, "assets-repo-missing-name");
  await fs.mkdir(repoRoot, { recursive: true });
  await fs.writeFile(path.join(repoRoot, "missing-name.yaml"), "dcc_uri: configs/team\ndcc_definition_type: config\n", "utf8");

  await runDb(
    `INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
    ["assets-missing-name", "https://example.com/repo.git", repoRoot, new Date().toISOString(), new Date().toISOString()]
  );

  const { execFile } = await import("node:child_process");
  const runGit = (args) => new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });

  await runGit(["init"]);
  await runGit(["add", "."]);

  const result = await loadDefinitions();
  const skipped = (result.skippedDefinitions || []).find((entry) => path.basename(entry.filePath) === "missing-name.yaml");
  assert.equal(skipped?.reason, "dcc_definition_type is config but required field 'name' is missing");
});

test("loadDefinitions keeps markdown rule with colon-containing description", async () => {
  await resetTables();

  const repoRoot = path.join(tempRoot, "assets-repo-markdown-colon-description");
  await fs.mkdir(repoRoot, { recursive: true });
  await fs.writeFile(path.join(repoRoot, "debugging_rules.md"), `---
alwaysApply: false
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
`, "utf8");

  await runDb(
    `INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
    ["assets-markdown-colon", "https://example.com/repo.git", repoRoot, new Date().toISOString(), new Date().toISOString()]
  );

  const { execFile } = await import("node:child_process");
  const runGit = (args) => new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });

  await runGit(["init"]);
  await runGit(["add", "."]);

  const result = await loadDefinitions();
  const rows = await allDb("SELECT key, filePath FROM definitions ORDER BY filePath ASC");

  assert.equal(rows.length, 1);
  assert.equal(path.basename(rows[0].filePath), "debugging_rules.md");
  assert.equal(rows[0].key, "rules::dev/rules/debugging-rules");
  assert.equal((result.skippedDefinitions || []).length, 0);
});

test("loadDefinitions imports yaml doc definition with dcc_definition_type doc", async () => {
  await resetTables();

  const repoRoot = path.join(tempRoot, "assets-repo-doc-definition");
  await fs.mkdir(repoRoot, { recursive: true });
  await fs.writeFile(path.join(repoRoot, "csharp-docs.yaml"), `name: C# Docs
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
`, "utf8");

  await runDb(
    `INSERT INTO asset_repos (name, remoteUrl, localPath, enabled, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`,
    ["assets-doc-definition", "https://example.com/repo.git", repoRoot, new Date().toISOString(), new Date().toISOString()]
  );

  const { execFile } = await import("node:child_process");
  const runGit = (args) => new Promise((resolve, reject) => {
    execFile("git", args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });

  await runGit(["init"]);
  await runGit(["add", "."]);

  const result = await loadDefinitions();
  const rows = await allDb("SELECT key, type, filePath FROM definitions ORDER BY filePath ASC");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, "doc");
  assert.equal(rows[0].key, "docs::dev/docs/csharp_docs");
  assert.equal(path.basename(rows[0].filePath), "csharp-docs.yaml");
  assert.equal((result.skippedDefinitions || []).length, 0);
});
