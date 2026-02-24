import fs from "fs";
import path from "path";
import {
  IGNORED_SCAN_DIR_NAMES,
  TREE_CONTENT_READ_MAX_BYTES,
  TREE_SCAN_MAX_DEPTH,
  TREE_SCAN_MAX_FILES,
} from "./constants.js";

const fsp = fs.promises;

export async function readRootEntries(repoPath) {
  try {
    return await fsp.readdir(repoPath, { withFileTypes: true });
  } catch (_error) {
    return [];
  }
}

export function buildEntryMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.name, entry);
  }
  return map;
}

export function shouldSkipDirectoryName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (IGNORED_SCAN_DIR_NAMES.has(normalized)) {
    return true;
  }
  return normalized.endsWith("-packages") || normalized.endsWith("_modules");
}

export async function readFileWithLimit(filePath, maxBytes = TREE_CONTENT_READ_MAX_BYTES) {
  try {
    const handle = await fsp.open(filePath, "r");
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    await handle.close();
    return buffer.slice(0, bytesRead).toString("utf8");
  } catch (_error) {
    return "";
  }
}

export async function listRepoFiles(repoPath, maxDepth = TREE_SCAN_MAX_DEPTH, maxFiles = TREE_SCAN_MAX_FILES) {
  const files = [];

  async function walk(dir, depth) {
    if (files.length >= maxFiles) {
      return;
    }

    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) {
        return;
      }

      const absolutePath = path.join(dir, entry.name);
      const relativePath = path.relative(repoPath, absolutePath);
      if (!relativePath || relativePath.startsWith(".git")) {
        continue;
      }

      if (entry.isDirectory()) {
        if (shouldSkipDirectoryName(entry.name)) {
          continue;
        }
        if (depth < maxDepth) {
          await walk(absolutePath, depth + 1);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push({ name: entry.name, absolutePath, relativePath });
      }
    }
  }

  await walk(repoPath, 0);
  return files;
}

export function matchesGlobSuffix(name, signalPattern) {
  const suffix = signalPattern.slice(1);
  return name.endsWith(suffix);
}
