import test from "node:test";
import assert from "node:assert/strict";

import { getProjectDestinationInfo } from "../src/server/definitions/install.js";

test("config definitions install into .continue/agents/configs/team", () => {
  const destinationInfo = getProjectDestinationInfo("/tmp/project", "configs", "configs/team-config.yaml");

  assert.equal(destinationInfo.normalizedType, "configs");
  assert.equal(destinationInfo.destDir, "/tmp/project/.continue/agents/configs/team");
  assert.equal(destinationInfo.destPath, "/tmp/project/.continue/agents/configs/team/team-config.yaml");
});

test("agent definitions continue to install into .continue/agents/team/agents", () => {
  const destinationInfo = getProjectDestinationInfo("/tmp/project", "agents", "agents/copilot.yaml");

  assert.equal(destinationInfo.normalizedType, "agents");
  assert.equal(destinationInfo.destDir, "/tmp/project/.continue/agents/team/agents");
  assert.equal(destinationInfo.destPath, "/tmp/project/.continue/agents/team/agents/copilot.yaml");
});
