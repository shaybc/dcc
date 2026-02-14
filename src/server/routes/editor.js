import fs from "fs";
import path from "path";
import express from "express";
import { detectDefinitionType } from "../definitions/detectDefinitionType.js";
import { loadDefinition } from "../definitions/loadDefinition.js";
import { saveDefinition } from "../definitions/saveDefinition.js";
import { loadDefinitions } from "../definitions/index.js";
import { extractDccUriFromDefinitionContent } from "../definitions/metadata.js";
import { allDb, getDb } from "../db/helpers.js";
import { getAssetRepo, listAssetRepos } from "../utils/assetRepos.js";
import { runCommand } from "../utils/git.js";

const fsp = fs.promises;
const router = express.Router();

function resolveRepoFromAbsolutePath(absoluteDefinitionPath, repos) {
  const sortedRepos = [...repos]
    .map((repo) => ({ ...repo, absoluteLocalPath: path.resolve(repo.localPath) }))
    .sort((a, b) => b.absoluteLocalPath.length - a.absoluteLocalPath.length);

  return sortedRepos.find((repo) => {
    if (absoluteDefinitionPath === repo.absoluteLocalPath) return true;
    return absoluteDefinitionPath.startsWith(`${repo.absoluteLocalPath}${path.sep}`);
  }) || null;
}

async function resolveDefinitionRepoContext({ definitionPath, definitionId }) {
  const normalizedPath = String(definitionPath || "").trim();
  const normalizedId = Number(definitionId);

  let definition = null;
  if (Number.isInteger(normalizedId) && normalizedId > 0) {
    definition = await getDb("SELECT id, filePath, repoId, source FROM definitions WHERE id = ?", [normalizedId]);
  } else if (normalizedPath) {
    definition = await getDb("SELECT id, filePath, repoId, source FROM definitions WHERE filePath = ?", [normalizedPath]);
  }

  if (!definition) {
    throw new Error("Definition not found for editor context.");
  }

  if (definition.repoId) {
    const repo = await getAssetRepo(definition.repoId);
    if (repo) {
      return {
        definition,
        repo,
        absoluteFilePath: path.resolve(definition.filePath || normalizedPath)
      };
    }
  }

  const absoluteFilePath = path.resolve(definition.filePath || normalizedPath);
  const repos = await listAssetRepos();
  const repo = resolveRepoFromAbsolutePath(absoluteFilePath, repos);
  if (!repo) {
    throw new Error("Unable to resolve owning repository for definition.");
  }

  return {
    definition,
    repo,
    absoluteFilePath
  };
}

async function validateDccUriForEditorSave({ mode, definitionPath, content, format }) {
  const dccUri = extractDccUriFromDefinitionContent(content, { filePath: definitionPath, format });
  if (!dccUri) {
    throw new Error("DCC URI is required.");
  }

  const normalizedIncoming = dccUri.toLowerCase();
  const activePath = mode === "edit" && definitionPath
    ? path.resolve(String(definitionPath || ""))
    : "";

  const existingDefinitions = await allDb("SELECT id, name, filePath, content FROM definitions");
  for (const item of existingDefinitions) {
    const existingPath = item?.filePath ? path.resolve(item.filePath) : "";
    if (activePath && existingPath && activePath === existingPath) {
      continue;
    }

    const existingDccUri = extractDccUriFromDefinitionContent(item?.content || "", {
      filePath: item?.filePath || "",
      format: item?.filePath && [".md", ".markdown", ".mdx"].includes(path.extname(String(item.filePath)).toLowerCase()) ? "markdown" : "yaml"
    });

    if (existingDccUri && existingDccUri.toLowerCase() === normalizedIncoming) {
      throw new Error(`DCC URI '${dccUri}' is already used by definition '${item?.name || item?.filePath || "unknown"}'.`);
    }
  }

  return dccUri;
}

router.get("/api/editor/definition", async (req, res) => {
  try {
    const definitionPath = String(req.query.path || "").trim();
    const definitionId = Number(req.query.id);
    if (!definitionPath && (!Number.isInteger(definitionId) || definitionId <= 0)) {
      res.status(400).json({ error: "Definition path or id is required." });
      return;
    }

    const context = await resolveDefinitionRepoContext({ definitionPath, definitionId });
    const loaded = await loadDefinition(context.repo.localPath, context.absoluteFilePath);
    res.json(loaded);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/editor/detect-type", (req, res) => {
  try {
    const type = detectDefinitionType(req.body?.content || "", req.body?.path || "");
    res.json({ type });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/api/editor/save", async (req, res) => {
  try {
    const mode = String(req.body?.mode || "").trim();
    let repoPath = "";
    let definitionPath = String(req.body?.path || "").trim();

    if (mode === "edit") {
      const context = await resolveDefinitionRepoContext({
        definitionPath,
        definitionId: req.body?.definitionId
      });
      repoPath = context.repo.localPath;
      definitionPath = context.absoluteFilePath;
    } else if (mode === "create") {
      const destinationRepoId = Number(req.body?.destinationRepoId);
      if (!Number.isInteger(destinationRepoId) || destinationRepoId <= 0) {
        res.status(400).json({ error: "Destination repository id is required for create mode." });
        return;
      }

      const destinationRepo = await getAssetRepo(destinationRepoId);
      if (!destinationRepo) {
        res.status(400).json({ error: "Selected destination repository was not found." });
        return;
      }
      repoPath = destinationRepo.localPath;
    } else {
      res.status(400).json({ error: "Invalid editor mode." });
      return;
    }

    await validateDccUriForEditorSave({
      mode,
      definitionPath,
      content: req.body?.content || "",
      format: req.body?.format || "yaml"
    });

    const result = await saveDefinition({
      mode,
      repoPath,
      definitionPath,
      content: req.body?.content || "",
      format: req.body?.format || "yaml",
      filename: req.body?.filename,
      targetPath: req.body?.targetPath,
      runCommand,
      reloadDefinitions: loadDefinitions,
    });

    await loadDefinitions();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
