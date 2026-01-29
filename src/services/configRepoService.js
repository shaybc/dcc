import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import simpleGit from "simple-git";
import { env } from "../utils/env.js";
import { getDb } from "../db/sqlite.js";
import { getConfigRepoPath } from "./settingsService.js";

/**
 * The Continue config registry is a Bitbucket repo cloned locally.
 * Continue uses ~/.continue/config.json -> configPath -> <clone>/.continue
 */
export function getContinueRoot() {
  return path.join(getConfigRepoPath(), ".continue");
}

export function getLocalContinueRoot() {
  return env.LOCAL_CONTINUE_PATH || path.join(os.homedir(), ".continue");
}

function getCategories() {
  return ["prompts", "agents", "workflows", "rules", "context", "mcpServers", "models"];
}

function getDefinitionMetadataRoot(root) {
  return path.join(root, ".dcc", "definitions");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "definition";
}

function defaultExtensionFor(type) {
  const defaults = {
    prompts: "md",
    agents: "yaml",
    workflows: "yaml",
    rules: "yaml",
    context: "yaml",
    mcpServers: "yaml",
    models: "yaml"
  };
  return defaults[type] || "md";
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function epochMillis(dateString) {
  const parsed = Date.parse(dateString);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function upsertDefinitionRecord(definition) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO definitions (
      id, type, name, description, created_by, created_at, updated_at, repo_path, local_path, file_name
    ) VALUES (
      @id, @type, @name, @description, @created_by, @created_at, @updated_at, @repo_path, @local_path, @file_name
    )
    ON CONFLICT(repo_path) DO UPDATE SET
      type=excluded.type,
      name=excluded.name,
      description=excluded.description,
      created_by=excluded.created_by,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      local_path=excluded.local_path,
      file_name=excluded.file_name
  `);
  stmt.run({
    id: definition.id,
    type: definition.type,
    name: definition.name,
    description: definition.description || null,
    created_by: definition.createdBy || null,
    created_at: epochMillis(definition.createdAt),
    updated_at: epochMillis(definition.updatedAt),
    repo_path: definition.repoPath,
    local_path: definition.localPath,
    file_name: definition.fileName
  });
}

async function commitAndPush(repoPath, filePaths, message) {
  const git = simpleGit(repoPath);
  const status = await git.status();
  if (status.isClean()) {
    return { committed: false, branch: status.current || "", commit: "" };
  }
  const relativePaths = filePaths.map((filePath) => path.relative(repoPath, filePath));
  await git.add(relativePaths);
  const commitSummary = await git.commit(message);
  const branch = status.current;
  if (branch) {
    await git.push("origin", branch);
  }
  return { committed: true, branch: branch || "", commit: commitSummary.commit || "" };
}

function buildDefinitionFileInfo({ type, name, fileName, fileExtension }) {
  const sanitizedName = fileName ? path.basename(fileName) : "";
  const parsed = sanitizedName ? path.parse(sanitizedName) : null;
  const slug = parsed?.name ? slugify(parsed.name) : slugify(name);
  const extensionFromName = parsed?.ext ? parsed.ext.replace(".", "") : "";
  const extension = extensionFromName || (fileExtension ? fileExtension.replace(".", "") : "") || defaultExtensionFor(type);
  const finalFileName = `${slug}.${extension}`;
  return { slug, extension, fileName: finalFileName };
}

export function listDefinitions() {
  const root = getContinueRoot();
  const localRoot = getLocalContinueRoot();
  const categories = getCategories();
  const out = {};
  const definitions = [];

  for (const type of categories) {
    const dir = path.join(root, type);
    out[type] = fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => d.name)
      : [];

    out[type].forEach((fileName) => {
      const base = path.parse(fileName).name;
      const metadataPath = path.join(getDefinitionMetadataRoot(root), type, `${base}.json`);
      const metadata = readJsonFile(metadataPath);
      const repoPath = path.join(dir, fileName);
      const localPath = path.join(localRoot, type, fileName);
      definitions.push({
        type,
        name: metadata?.name || base,
        description: metadata?.description || "",
        createdBy: metadata?.createdBy || "",
        createdAt: metadata?.createdAt || "",
        updatedAt: metadata?.updatedAt || "",
        fileName,
        repoPath,
        localPath
      });
    });
  }

  return { root, localRoot, categories: out, definitions };
}

export async function createDefinition({
  type,
  name,
  description = "",
  content,
  createdBy = "",
  fileName,
  fileExtension,
  commitMessage
}) {
  const categories = getCategories();
  if (!categories.includes(type)) {
    throw new Error(`Unknown definition type '${type}'.`);
  }
  if (!name) {
    throw new Error("Definition name is required.");
  }
  if (typeof content !== "string") {
    throw new Error("Definition content is required.");
  }

  const { slug, fileName: finalFileName } = buildDefinitionFileInfo({
    type,
    name,
    fileName,
    fileExtension
  });

  const repoRoot = getContinueRoot();
  const localRoot = getLocalContinueRoot();
  const repoDir = path.join(repoRoot, type);
  const localDir = path.join(localRoot, type);
  ensureDir(repoDir);
  ensureDir(localDir);

  const metadataDir = path.join(getDefinitionMetadataRoot(repoRoot), type);
  const localMetadataDir = path.join(getDefinitionMetadataRoot(localRoot), type);
  ensureDir(metadataDir);
  ensureDir(localMetadataDir);

  const repoPath = path.join(repoDir, finalFileName);
  const localPath = path.join(localDir, finalFileName);
  const metadataPath = path.join(metadataDir, `${slug}.json`);
  const localMetadataPath = path.join(localMetadataDir, `${slug}.json`);
  const existingMetadata = readJsonFile(metadataPath);

  const now = formatTimestamp();
  const definition = {
    id: existingMetadata?.id || crypto.randomUUID(),
    type,
    name,
    description,
    createdBy: existingMetadata?.createdBy || createdBy,
    createdAt: existingMetadata?.createdAt || now,
    updatedAt: now,
    fileName: finalFileName,
    repoPath,
    localPath
  };

  fs.writeFileSync(repoPath, content, "utf-8");
  fs.writeFileSync(localPath, content, "utf-8");
  fs.writeFileSync(metadataPath, JSON.stringify(definition, null, 2), "utf-8");
  fs.writeFileSync(localMetadataPath, JSON.stringify(definition, null, 2), "utf-8");

  upsertDefinitionRecord(definition);

  const gitResult = await commitAndPush(getConfigRepoPath(), [repoPath, metadataPath], commitMessage || `Update ${type} definition: ${name}`);

  return { definition, git: gitResult };
}
