import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

const CONTEXT_KEYS = ["contextLength", "contextWindow", "maxInputTokens", "maxTokens", "num_ctx"];

function readContextLengthFromEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  for (const key of CONTEXT_KEYS) {
    const directValue = Number(entry[key]);
    if (Number.isFinite(directValue) && directValue > 0) {
      return Math.floor(directValue);
    }
  }

  const completionOptions = entry.defaultCompletionOptions;
  if (completionOptions && typeof completionOptions === "object") {
    for (const key of CONTEXT_KEYS) {
      const nestedValue = Number(completionOptions[key]);
      if (Number.isFinite(nestedValue) && nestedValue > 0) {
        return Math.floor(nestedValue);
      }
    }
  }

  return null;
}

export async function resolveProjectContextWindow(projectPath) {
  const normalizedProjectPath = String(projectPath || "").trim();
  if (!normalizedProjectPath) {
    return null;
  }

  const configPath = path.join(normalizedProjectPath, ".continue", "agents", "team", "project_config.yaml");
  let rawContent = "";
  try {
    rawContent = await fs.readFile(configPath, "utf8");
  } catch (_error) {
    return null;
  }

  let parsed;
  try {
    parsed = YAML.parse(rawContent) || {};
  } catch (_error) {
    return null;
  }

  if (Array.isArray(parsed.models)) {
    for (const entry of parsed.models) {
      const contextValue = readContextLengthFromEntry(entry);
      if (contextValue) {
        return contextValue;
      }
    }
  }

  return readContextLengthFromEntry(parsed);
}
