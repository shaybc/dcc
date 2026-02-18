import os from "os";
import path from "path";
import { normalizeDefinitionType } from "./parse.js";

export function getTeamRoot() {
  return path.join(os.homedir(), ".continue", "team");
}

export function getProjectDestinationInfo(projectPath, type, filePath) {
  const normalizedType = normalizeDefinitionType(type);
  const fileName = path.basename(filePath || "");
  const mappings = {
    rules: [".continue", "rules", "team", "rules"],
    prompts: [".continue", "rules", "team", "prompts"],
    workflows: [".continue", "workflows", "team", "workflows"],
    models: [".continue", "models", "team", "models"],
    agents: [".continue", "agents", "team", "agents"],
    mcpservers: [".continue", "mcpServers", "team", "mcpServers"],
    docs: [".continue", "docs", "team", "docs"],
    configs: [".continue", "agents", "configs", "team"]
  };
  const destinationSegments = mappings[normalizedType];
  if (!destinationSegments) return null;
  const destDir = path.join(projectPath, ...destinationSegments);
  return { destDir, destPath: path.join(destDir, fileName), normalizedType };
}

export function deriveConfigOutputFileName(definitionPath = "") {
  const baseName = path.basename(String(definitionPath || "").trim());
  if (/\.ya?ml$/i.test(baseName)) return baseName;
  const stem = baseName.replace(/\.[^.]*$/, "") || "config";
  return `${stem}.yaml`;
}
