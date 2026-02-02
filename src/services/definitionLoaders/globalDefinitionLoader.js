import os from "os";
import path from "path";
import { loadDefinitionsFromRoot } from "./definitionLoaderUtils.js";

export function loadGlobalDefinitions() {
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const root = path.join(appData, "Continue");
  return loadDefinitionsFromRoot(root, "global");
}
