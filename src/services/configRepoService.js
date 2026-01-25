import fs from "fs";
import path from "path";
import { env } from "../utils/env.js";

/**
 * The Continue config registry is a Bitbucket repo cloned locally.
 * Continue uses ~/.continue/config.json -> configPath -> <clone>/.continue
 */
export function getContinueRoot() {
  return path.join(env.CONFIG_REPO_PATH, ".continue");
}

export function listDefinitions() {
  const root = getContinueRoot();
  const categories = ["prompts", "agents", "workflows", "rules", "tools"];
  const out = {};
  for (const c of categories) {
    const dir = path.join(root, c);
    out[c] = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isFile() || d.isDirectory())
      .map(d => d.name) : [];
  }
  return { root, categories: out };
}
