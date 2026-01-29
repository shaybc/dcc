import fs from "fs";
import path from "path";

const ASSET_FOLDERS = {
  rules: { source: "rules", destination: path.join(".continue", "rules", "team", "rules") },
  prompts: { source: "prompts", destination: path.join(".continue", "rules", "team", "prompts") },
  workflows: { source: "workflows", destination: path.join(".continue", "workflows", "team") },
  models: { source: "models", destination: path.join(".continue", "models", "team") },
  agents: { source: "agents", destination: path.join(".continue", "agents", "team") },
  mcpServers: { source: "mcpServers", destination: path.join(".continue", "mcpServers", "team") }
};

const CONTEXT_KEY = "context";

function buildCopyError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath).flatMap((entry) => {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return listFiles(fullPath);
    }
    return fullPath;
  });
}

function copyDirectoryContents(sourceDir, destinationDir, overwrite) {
  const copied = [];
  const conflicts = [];
  if (!fs.existsSync(sourceDir)) {
    return { copied, conflicts };
  }

  listFiles(sourceDir).forEach((filePath) => {
    const relativePath = path.relative(sourceDir, filePath);
    const targetPath = path.join(destinationDir, relativePath);
    if (fs.existsSync(targetPath) && !overwrite) {
      conflicts.push(targetPath);
      return;
    }
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(filePath, targetPath);
    copied.push(targetPath);
  });

  return { copied, conflicts };
}

function readContextProviders(contextDir) {
  if (!fs.existsSync(contextDir)) {
    return [];
  }
  return fs.readdirSync(contextDir)
    .filter((entry) => fs.statSync(path.join(contextDir, entry)).isFile())
    .map((entry) => fs.readFileSync(path.join(contextDir, entry), "utf-8"))
    .map((content) => content.split(/\r?\n/))
    .flat()
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseConfigContextLines(configContent) {
  const lines = configContent.split(/\r?\n/);
  const contextIndex = lines.findIndex((line) => /^context:\s*$/.test(line));
  if (contextIndex === -1) {
    return { lines, contextIndex: -1, existing: new Set() };
  }
  const existing = new Set();
  for (let i = contextIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/^\s+-\s+provider:\s*/.test(line)) {
      if (/^\S/.test(line)) {
        break;
      }
      continue;
    }
    const match = line.match(/provider:\s*([^\s#]+)/);
    if (match) {
      existing.add(match[1]);
    }
  }
  return { lines, contextIndex, existing };
}

function mergeContextProviders(configPath, providers) {
  const existingContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf-8") : "";
  const { lines, contextIndex, existing } = parseConfigContextLines(existingContent);
  const additions = providers.filter((provider) => !existing.has(provider));
  if (additions.length === 0) {
    if (!existingContent) {
      fs.writeFileSync(configPath, "context:\n", "utf-8");
    }
    return { added: [] };
  }

  if (contextIndex === -1) {
    const newLines = [...lines];
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== "") {
      newLines.push("");
    }
    newLines.push("context:");
    additions.forEach((provider) => {
      newLines.push(`  - provider: ${provider}`);
    });
    fs.writeFileSync(configPath, `${newLines.join("\n")}\n`, "utf-8");
    return { added: additions };
  }

  const insertIndex = (() => {
    for (let i = contextIndex + 1; i < lines.length; i += 1) {
      if (/^\S/.test(lines[i])) {
        return i;
      }
    }
    return lines.length;
  })();

  const newLines = [...lines];
  const insertion = additions.map((provider) => `  - provider: ${provider}`);
  newLines.splice(insertIndex, 0, ...insertion);
  fs.writeFileSync(configPath, `${newLines.join("\n")}\n`, "utf-8");
  return { added: additions };
}

export function copyAiAssetsToProject({ projectPath, selections, overwrite }) {
  if (!fs.existsSync(projectPath)) {
    throw buildCopyError("Project path does not exist.", 400);
  }

  const aiAssetsRoot = path.join("c:\\git\\ai_assets");
  const conflicts = [];
  const copied = [];
  const contextResult = { added: [] };

  selections.forEach((selection) => {
    if (selection === CONTEXT_KEY) {
      const contextDir = path.join(aiAssetsRoot, "context");
      const providers = readContextProviders(contextDir);
      const configPath = path.join(projectPath, ".continue", "config.yaml");
      ensureDir(path.dirname(configPath));
      const { added } = mergeContextProviders(configPath, providers);
      contextResult.added.push(...added);
      return;
    }

    const mapping = ASSET_FOLDERS[selection];
    if (!mapping) {
      return;
    }
    const sourceDir = path.join(aiAssetsRoot, mapping.source);
    const destinationDir = path.join(projectPath, mapping.destination);
    ensureDir(destinationDir);
    const { copied: copiedFiles, conflicts: conflictsFound } = copyDirectoryContents(
      sourceDir,
      destinationDir,
      overwrite
    );
    copied.push(...copiedFiles);
    conflicts.push(...conflictsFound);
  });

  return {
    copied,
    conflicts,
    context: contextResult
  };
}
