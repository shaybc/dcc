import os from "os";
import path from "path";
import { loadDefinitionsFromRoot } from "./definitionLoaderUtils.js";

export function loadUserDefinitions() {
  const root = path.join(os.homedir(), ".continue");
  return loadDefinitionsFromRoot(root, "user");
}
