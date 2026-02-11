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
  await fs.writeFile(path.join(repoRoot, "valid.yaml"), "name: Valid\ndcc_uri: prompts/valid\n", "utf8");
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Readme without metadata\n", "utf8");

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

  await loadDefinitions();

  const rows = await allDb("SELECT key, filePath, source FROM definitions ORDER BY filePath ASC");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].filePath, path.join(repoRoot, "valid.yaml"));
  assert.equal(rows[0].key, "prompts::prompts/valid");
  assert.equal(rows[0].source, "repo");
});
