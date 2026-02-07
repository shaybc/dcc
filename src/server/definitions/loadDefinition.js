import fs from "fs/promises";
import path from "path";
import { detectDefinitionType } from "./detectDefinitionType.js";

export async function loadDefinition(baseRepoPath, definitionPath) {
  const absoluteRepoPath = path.resolve(baseRepoPath);
  const absoluteDefinitionPath = path.resolve(absoluteRepoPath, definitionPath);

  if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`) && absoluteDefinitionPath !== absoluteRepoPath) {
    throw new Error("Definition path must be inside the configured repository.");
  }

  const content = await fs.readFile(absoluteDefinitionPath, "utf8");
  const type = detectDefinitionType(content, absoluteDefinitionPath);

  return {
    path: absoluteDefinitionPath,
    relativePath: path.relative(absoluteRepoPath, absoluteDefinitionPath),
    content,
    type
  };
}
