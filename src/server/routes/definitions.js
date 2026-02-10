import express from "express";
import db from "../db/index.js";
import { allDb } from "../db/helpers.js";
import { getSetting } from "../utils/settings.js";
import { getFileCreatedAt } from "../utils/files.js";
import { extractDccUriFromDefinitionContent } from "../definitions/metadata.js";
import { normalizeDefinitionType } from "../definitions/parse.js";

const router = express.Router();

router.get("/api/definition-tags", async (_req, res) => {
  try {
    const rows = await allDb("SELECT tags FROM definitions");
    const tags = Array.from(new Set(rows
      .flatMap((row) => String(row?.tags || "").split(","))
      .map((tag) => tag.trim())
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/definitions/references", async (_req, res) => {
  try {
    const rows = await allDb("SELECT type, name, content, filePath FROM definitions");
    const refs = rows
      .map((row) => {
        const dcc_uri = extractDccUriFromDefinitionContent(row?.content || "", { filePath: row?.filePath || "" });
        return {
          type: normalizeDefinitionType(row?.type || ""),
          name: row?.name || "",
          dcc_uri
        };
      })
      .filter((item) => item.dcc_uri);
    res.json(refs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/definitions", async (req, res) => {
  try {
    const currentDevProject = await getSetting("currentDevProject");
    const definitionsRows = await allDb(
      "SELECT id, key, name, description, tags, schema, version, type, filePath, source, inTeam, status FROM definitions"
    );

    if (!currentDevProject) {
      res.json(definitionsRows);
      return;
    }

    const copiedRows = await allDb(
      "SELECT definitionKey FROM project_definition_copies WHERE projectPath = ?",
      [currentDevProject]
    );
    const copiedKeys = new Set(copiedRows.map((row) => row.definitionKey));
    const rows = definitionsRows.map((row) => ({ ...row, status: copiedKeys.has(row.key) ? "saved" : "repo" }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/definitions/:id", (req, res) => {
  db.get(
    "SELECT * FROM definitions WHERE id = ?",
    [req.params.id],
    async (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: "Definition not found." });
        return;
      }

      const createdAt = await getFileCreatedAt(row.filePath);

      let content = row.content;
      if (row.filePath) {
        try {
          content = await fsp.readFile(row.filePath, "utf8");
        } catch (_error) {
          content = row.content;
        }
      }

      res.json({ ...row, content, createdAt });
    }
  );
});


export default router;
