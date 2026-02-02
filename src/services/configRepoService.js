import fs from "fs";
import os from "os";
import path from "path";
import { env } from "../utils/env.js";
import { insertDefinitions } from "./definitionsStore.js";
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
  const categories = getCategories();
  const out = {};

  for (const type of categories) {
    const dir = path.join(root, type);
    out[type] = fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => d.name)
      : [];
  }

  return { root, categories: out };
}

export async function createDefinition({
  type,
  name,
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
  const repoPath = path.join(repoRoot, type, finalFileName);
  const localPath = path.join(localRoot, type, finalFileName);

  insertDefinitions([{
    type,
    name,
    source: "manual",
    content
  }]);
  void content;
  void commitMessage;
  void createdBy;
  void repoPath;
  void localPath;

  return { definition: { type, name, fileName: finalFileName }, git: { committed: false, branch: "", commit: "" } };
}
