import fs from "fs";
import path from "path";
import { getLocalContinueRoot } from "./configRepoService.js";

const ALLOWED_TYPE_FOLDERS = new Set([
  "prompt",
  "rule",
  "model",
  "agent",
  "user",
  "org",
  "mcp",
  "config",
  "unknown"
]);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeTypeFolder(typeFolder) {
  const normalized = String(typeFolder || "").trim().toLowerCase();
  if (!ALLOWED_TYPE_FOLDERS.has(normalized)) {
    throw new Error(`Unsupported definition type folder '${typeFolder}'.`);
  }
  return normalized;
}

function sanitizeFileName(fileName) {
  const base = path.basename(String(fileName || "").trim());
  if (!base) {
    throw new Error("Definition file name is required.");
  }
  return base;
}

export function saveContinueDefinition({ typeFolder, fileName, content }) {
  if (typeof content !== "string") {
    throw new Error("Definition content is required.");
  }
  const normalizedType = sanitizeTypeFolder(typeFolder);
  const normalizedFile = sanitizeFileName(fileName);
  const root = getLocalContinueRoot();
  const destinationDir = path.join(root, "team", normalizedType);
  ensureDir(destinationDir);
  const destinationPath = path.join(destinationDir, normalizedFile);
  fs.writeFileSync(destinationPath, content, "utf-8");
  return { path: destinationPath };
}

export function removeContinueDefinition({ typeFolder, fileName }) {
  const normalizedType = sanitizeTypeFolder(typeFolder);
  const normalizedFile = sanitizeFileName(fileName);
  const root = getLocalContinueRoot();
  const destinationPath = path.join(root, "team", normalizedType, normalizedFile);
  if (fs.existsSync(destinationPath)) {
    fs.unlinkSync(destinationPath);
    return { removed: true, path: destinationPath };
  }
  return { removed: false, path: destinationPath };
}
