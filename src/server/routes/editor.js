import fs from "fs";
import path from "path";
import express from "express";
import { detectDefinitionType } from "../definitions/detectDefinitionType.js";
import { loadDefinition } from "../definitions/loadDefinition.js";
import { saveDefinition } from "../definitions/saveDefinition.js";
import { loadDefinitions } from "../definitions/index.js";
import { extractDccUriFromDefinitionContent } from "../definitions/metadata.js";
import { allDb } from "../db/helpers.js";
import { getSetting } from "../utils/settings.js";
import { runCommand } from "../utils/git.js";

const fsp = fs.promises;
const router = express.Router();

async function validateDccUriForEditorSave({ mode, definitionPath, content, format, repoPath }) {
  const dccUri = extractDccUriFromDefinitionContent(content, { filePath: definitionPath, format });
  if (!dccUri) {
    throw new Error("DCC URI is required.");
  }

  const normalizedIncoming = dccUri.toLowerCase();
  const activePath = mode === "edit" && definitionPath
    ? path.resolve(path.resolve(repoPath), String(definitionPath || ""))
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
    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const definitionPath = String(req.query.path || "").trim();
    if (!definitionPath) {
      res.status(400).json({ error: "Definition path is required." });
      return;
    }

    const loaded = await loadDefinition(repoPath, definitionPath);
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
    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    await validateDccUriForEditorSave({
      mode: req.body?.mode,
      definitionPath: req.body?.path,
      content: req.body?.content || "",
      format: req.body?.format || "yaml",
      repoPath
    });

    const result = await saveDefinition({
      mode: req.body?.mode,
      repoPath,
      definitionPath: req.body?.path,
      content: req.body?.content || "",
      format: req.body?.format || "yaml",
      filename: req.body?.filename,
      targetPath: req.body?.targetPath,
      runCommand
    });

    await loadDefinitions();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
