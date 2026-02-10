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
    rules: ["rules", "rules"],
    prompts: ["rules", "prompts"],
    workflows: ["workflows", "workflows"],
    models: ["models", "models"],
    agents: ["agents", "agents"],
    mcpservers: ["mcpServers", "mcpServers"],
    docs: ["docs", "docs"],
    configs: ["configs", ""]
  };
  const mapped = mappings[normalizedType];
  if (!mapped) return null;
  const [continueFolder, typeFolder] = mapped;
  const destDir = path.join(projectPath, ".continue", continueFolder, "team", typeFolder);
  return { destDir, destPath: path.join(destDir, fileName), normalizedType };
}

export function deriveConfigOutputFileName(definitionPath = "") {
  const baseName = path.basename(String(definitionPath || "").trim());
  if (/\.ya?ml$/i.test(baseName)) return baseName;
  const stem = baseName.replace(/\.[^.]*$/, "") || "config";
  return `${stem}.yaml`;
}
