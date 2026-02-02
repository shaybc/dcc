import path from "path";
import { getConfigRepoPath } from "../settingsService.js";
import { loadDefinitionsFromRoot } from "./definitionLoaderUtils.js";

export function loadGitDefinitions() {
  const repoPath = getConfigRepoPath();
  const root = path.join(repoPath, ".continue");
  return loadDefinitionsFromRoot(root, "git");
}
