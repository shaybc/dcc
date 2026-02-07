import fs from "fs/promises";
import path from "path";
import { bumpVersionInContent } from "./versionBump.js";

function quoteShellValue(value) {
  return JSON.stringify(String(value));
}

export async function saveDefinition({
  mode,
  repoPath,
  definitionPath,
  content,
  format,
  filename,
  targetPath,
  runCommand
}) {
  const absoluteRepoPath = path.resolve(repoPath);

  if (mode === "create") {
    const safeFilename = path.basename(String(filename || "").trim());
    if (!safeFilename) {
      throw new Error("Filename is required for new definitions.");
    }

    const normalizedFolder = String(targetPath || "").trim().replace(/^\/+/, "");
    const outputDir = path.resolve(absoluteRepoPath, normalizedFolder);
    if (!outputDir.startsWith(`${absoluteRepoPath}${path.sep}`) && outputDir !== absoluteRepoPath) {
      throw new Error("Target path must be inside repository.");
    }

    await fs.mkdir(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, safeFilename);
    await fs.writeFile(outputFile, content, "utf8");

    return {
      message: "Definition created locally as untracked file.",
      path: outputFile,
      relativePath: path.relative(absoluteRepoPath, outputFile),
      git: "untracked"
    };
  }

  const absoluteDefinitionPath = path.resolve(absoluteRepoPath, definitionPath);
  if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
    throw new Error("Definition path must be inside repository.");
  }

  const bumpedContent = bumpVersionInContent(content, format);
  await runCommand("git pull", { cwd: absoluteRepoPath });
  await fs.writeFile(absoluteDefinitionPath, bumpedContent, "utf8");

  const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath);
  await runCommand(`git add ${quoteShellValue(relativePath)}`, { cwd: absoluteRepoPath });
  await runCommand(`git commit -m ${quoteShellValue(`Update ${relativePath}`)}`, { cwd: absoluteRepoPath });
  await runCommand("git push", { cwd: absoluteRepoPath });

  return {
    message: "Definition saved, version bumped, and pushed.",
    content: bumpedContent,
    path: absoluteDefinitionPath,
    relativePath,
    git: "pushed"
  };
}
