import path from "path";
import { loadDefinitionsFromRoot } from "./definitionLoaderUtils.js";

export function loadProjectDefinitions() {
  const root = path.join(process.cwd(), ".continue");
  return loadDefinitionsFromRoot(root, "project");
}
