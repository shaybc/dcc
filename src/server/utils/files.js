import fs from "fs";
import path from "path";

const fsp = fs.promises;

export async function walkFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export async function getFileCreatedAt(filePath) {
  try {
    const stat = await fsp.stat(filePath);
    return stat.birthtime?.toISOString() || stat.ctime?.toISOString() || new Date().toISOString();
  } catch (_error) {
    return new Date().toISOString();
  }
}
