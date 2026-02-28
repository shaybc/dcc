import test from "node:test";
import assert from "node:assert/strict";

import { createSpawnSpec } from "../src/server/services/agentRunManager/commandLaunch.js";

test("createSpawnSpec includes explicit project cwd in launched command", () => {
  const spec = createSpawnSpec("cn", ["--config", "cfg.yaml", "--agent", "team/agent"], process.cwd(), "/tmp/my project");

  assert.equal(spec.command, "cn");
  assert.match(spec.launchedCommand, /^cd '\/tmp\/my project' && cn /);
  assert.match(spec.launchedCommand, /--config cfg.yaml --agent team\/agent$/);
});

test("createSpawnSpec keeps launched command unchanged when cwd is empty", () => {
  const spec = createSpawnSpec("cn", ["--config", "cfg.yaml"], process.cwd(), "");
  assert.equal(spec.launchedCommand, "cn --config cfg.yaml");
});
