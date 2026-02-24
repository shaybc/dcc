import { AgentRunManager } from "./agentRunManager/AgentRunManager.js";
import { buildArgs } from "./agentRunManager/runOptions.js";

export const agentRunManager = new AgentRunManager();

export function buildAgentRunArgs(input) {
  return buildArgs(input);
}
