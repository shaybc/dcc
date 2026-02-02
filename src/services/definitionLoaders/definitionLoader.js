import { clearDefinitions, insertDefinitions } from "../definitionsStore.js";
import { loadGitDefinitions } from "./gitDefinitionLoader.js";
import { loadGlobalDefinitions } from "./globalDefinitionLoader.js";
import { loadUserDefinitions } from "./userDefinitionLoader.js";
import { loadProjectDefinitions } from "./projectDefinitionLoader.js";

export function loadAllDefinitions() {
  const gitDefs = loadGitDefinitions();
  const globalDefs = loadGlobalDefinitions();
  const userDefs = loadUserDefinitions();
  const projectDefs = loadProjectDefinitions();

  const definitions = [...gitDefs, ...globalDefs, ...userDefs, ...projectDefs];
  clearDefinitions();
  const result = insertDefinitions(definitions);

  return {
    total: definitions.length,
    inserted: result.inserted,
    sources: {
      git: gitDefs.length,
      global: globalDefs.length,
      user: userDefs.length,
      project: projectDefs.length
    }
  };
}
