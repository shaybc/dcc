import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { saveDefinition } from "../src/server/definitions/saveDefinition.js";

test("saveDefinition keeps untracked edited definitions local", async () => {
  const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-save-def-"));
  const definitionPath = "definitions/local-only.yaml";
  const absolutePath = path.join(repoPath, definitionPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const commandLog = [];
  const runCommand = async (command) => {
    commandLog.push(command);
    if (command.startsWith("git ls-files --error-unmatch")) {
      throw new Error("not tracked");
    }
    throw new Error(`Unexpected command: ${command}`);
  };

  const result = await saveDefinition({
    mode: "edit",
    repoPath,
    definitionPath,
    content: "version: 0.0.1\nname: local\n",
    format: "yaml",
    runCommand
  });

  const savedContent = await fs.readFile(absolutePath, "utf8");

  assert.equal(result.git, "untracked");
  assert.equal(savedContent, "version: 0.0.1\nname: local\n");
  assert.deepEqual(commandLog, [
    `git ls-files --error-unmatch ${JSON.stringify(definitionPath)}`
  ]);
});

test("saveDefinition still commits tracked definitions", async () => {
  const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "dcc-save-def-"));
  const definitionPath = "definitions/tracked.yaml";
  const absolutePath = path.join(repoPath, definitionPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const commandLog = [];
  const runCommand = async (command) => {
    commandLog.push(command);
    if (command.startsWith("git ls-files --error-unmatch")) {
      return definitionPath;
    }
    return "ok";
  };

  const result = await saveDefinition({
    mode: "edit",
    repoPath,
    definitionPath,
    content: "version: 0.0.1\nname: tracked\n",
    format: "yaml",
    runCommand
  });

  assert.equal(result.git, "pushed");
  assert.equal(commandLog[0], `git ls-files --error-unmatch ${JSON.stringify(definitionPath)}`);
  assert.equal(commandLog[1], "git pull");
  assert.equal(commandLog[2], `git add ${JSON.stringify(definitionPath)}`);
  assert.equal(commandLog[3], `git commit -m ${JSON.stringify(`Update ${definitionPath}`)}`);
  assert.equal(commandLog[4], "git push");

  const savedContent = await fs.readFile(absolutePath, "utf8");
  assert.notEqual(savedContent, "version: 0.0.1\nname: tracked\n");
  assert.match(savedContent, /name:\s*tracked/);
});
