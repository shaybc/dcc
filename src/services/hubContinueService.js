import fs from "fs";
import os from "os";
import path from "path";
import { getConfigRepoPath } from "./settingsService.js";

const TYPE_SECTION_MAP = {
  Model: "models",
  Rule: "rules",
  "MCP Server": "mcpServers",
  Context: "context",
  Config: "context",
  Unknown: "context"
};

function ensureTeamDirectory() {
  const teamDir = path.join(os.homedir(), ".continue", "team");
  fs.mkdirSync(teamDir, { recursive: true });
  return teamDir;
}

function safeRelativePath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }
  const normalized = path.normalize(value).replace(/^([\\/])+/, "");
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return "";
  }
  return normalized;
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function formatYamlValue(value) {
  if (value === null || value === undefined) {
    return "\"\"";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function extractConfigFields(definition) {
  const fields = {
    name: definition.title || definition.id,
    description: definition.description || "Saved from Continue Hub.",
    dccHubId: definition.id
  };
  if (!definition.rawContent) {
    return fields;
  }
  try {
    const parsed = JSON.parse(definition.rawContent);
    if (typeof parsed !== "object" || !parsed) {
      return fields;
    }
    const candidates = ["uses", "content", "value", "model", "command"];
    candidates.forEach((key) => {
      const value = parsed[key];
      if (typeof value === "string" && value.trim().length > 0) {
        fields[key] = value.trim();
      }
    });
  } catch {
    return fields;
  }
  return fields;
}

function buildConfigEntryLines(definition) {
  const fields = extractConfigFields(definition);
  const lines = [];
  const entries = Object.entries(fields);
  entries.forEach(([key, value], index) => {
    if (index === 0) {
      lines.push(`  - ${key}: ${formatYamlValue(value)}`);
    } else {
      lines.push(`    ${key}: ${formatYamlValue(value)}`);
    }
  });
  return lines;
}

function findSectionRange(lines, sectionKey) {
  const startIndex = lines.findIndex((line) => line.trim() === `${sectionKey}:` && line.trimStart() === line);
  if (startIndex === -1) {
    return null;
  }
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() !== "" && line.trimStart() === line) {
      endIndex = i;
      break;
    }
  }
  return { startIndex, endIndex };
}

function appendConfigEntry(filePath, sectionKey, definition) {
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  const lines = content ? content.split(/\r?\n/) : [];
  const entryLines = buildConfigEntryLines(definition);
  const range = findSectionRange(lines, sectionKey);
  const hasEntry = content.includes(`dccHubId: ${formatYamlValue(definition.id)}`);
  if (hasEntry) {
    return { updated: false };
  }

  if (!range) {
    if (lines.length && lines[lines.length - 1].trim() !== "") {
      lines.push("");
    }
    lines.push(`${sectionKey}:`);
    lines.push(...entryLines);
  } else {
    lines.splice(range.endIndex, 0, ...entryLines);
  }
  fs.writeFileSync(filePath, lines.join("\n"));
  return { updated: true };
}

function removeConfigEntry(filePath, sectionKey, definitionId) {
  if (!fs.existsSync(filePath)) {
    return { updated: false };
  }
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
  const range = findSectionRange(lines, sectionKey);
  if (!range) {
    return { updated: false };
  }
  const idRegex = new RegExp(`^\\s*dccHubId:\\s*\"?${definitionId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\"?\\s*$`);
  let targetIndex = -1;
  for (let i = range.startIndex + 1; i < range.endIndex; i += 1) {
    if (idRegex.test(lines[i])) {
      targetIndex = i;
      break;
    }
  }
  if (targetIndex === -1) {
    return { updated: false };
  }
  let entryStart = targetIndex;
  while (entryStart > range.startIndex) {
    if (/^\s*-\s+/.test(lines[entryStart])) {
      break;
    }
    entryStart -= 1;
  }
  let entryEnd = targetIndex + 1;
  while (entryEnd < range.endIndex) {
    if (/^\s*-\s+/.test(lines[entryEnd])) {
      break;
    }
    entryEnd += 1;
  }
  lines.splice(entryStart, entryEnd - entryStart);

  const remainingRange = findSectionRange(lines, sectionKey);
  let hasItems = false;
  if (remainingRange) {
    for (let i = remainingRange.startIndex + 1; i < remainingRange.endIndex; i += 1) {
      if (/^\s*-\s+/.test(lines[i])) {
        hasItems = true;
        break;
      }
    }
    if (!hasItems) {
      lines.splice(remainingRange.startIndex, remainingRange.endIndex - remainingRange.startIndex);
      while (lines.length && lines[lines.length - 1].trim() === "") {
        lines.pop();
      }
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"));
  return { updated: true };
}

function resolveSectionKey(type) {
  return TYPE_SECTION_MAP[type] || "context";
}

function resolveSourceFile(definition) {
  const relativePath = safeRelativePath(definition.sourcePath || definition.fileName || "");
  if (!relativePath) {
    return "";
  }
  const repoRoot = getConfigRepoPath();
  const candidate = path.join(repoRoot, relativePath);
  return fileExists(candidate) ? candidate : "";
}

export function saveHubDefinition(definition) {
  const teamDir = ensureTeamDirectory();
  const sourceFile = resolveSourceFile(definition);
  if (sourceFile) {
    const destPath = path.join(teamDir, path.basename(sourceFile));
    fs.copyFileSync(sourceFile, destPath);
    return { saved: true, destination: destPath, mode: "file" };
  }
  const configPath = path.join(teamDir, "config.yaml");
  const sectionKey = resolveSectionKey(definition.type);
  const result = appendConfigEntry(configPath, sectionKey, definition);
  return { saved: true, destination: configPath, mode: "config", updated: result.updated };
}

export function removeHubDefinition(definition) {
  const teamDir = ensureTeamDirectory();
  const sourceFile = resolveSourceFile(definition);
  if (sourceFile) {
    const destPath = path.join(teamDir, path.basename(sourceFile));
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    return { removed: true, destination: destPath, mode: "file" };
  }
  const configPath = path.join(teamDir, "config.yaml");
  const sectionKey = resolveSectionKey(definition.type);
  const result = removeConfigEntry(configPath, sectionKey, definition.id);
  return { removed: true, destination: configPath, mode: "config", updated: result.updated };
}
