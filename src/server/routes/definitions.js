import express from "express";
import path from "path";
import db from "../db/index.js";
import { allDb, getDb } from "../db/helpers.js";
import { getSetting } from "../utils/settings.js";
import { getFileCreatedAt } from "../utils/files.js";
import { extractDccUriFromDefinitionContent } from "../definitions/metadata.js";
import { normalizeDefinitionType } from "../definitions/parse.js";
import { buildProjectTechnologyTokens, recommendDefinitions } from "../definitions/recommend.js";

const router = express.Router();

function normalizeRepoDisplayMetadata(definitionRow, repoRow) {
  const repoName = String(repoRow?.name || definitionRow?.repoName || "").trim();
  const repoRemoteUrl = String(repoRow?.remoteUrl || "").trim();
  const repoLocalPath = String(repoRow?.localPath || "").trim();
  const filePath = String(definitionRow?.filePath || "").trim();

  let repoRelativePath = "";
  if (repoLocalPath && filePath) {
    const relativePath = path.relative(repoLocalPath, filePath);
    if (relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      repoRelativePath = relativePath;
    }
  }

  return {
    repoDisplayName: repoName,
    repoRemoteUrl,
    repoRelativePath,
  };
}

async function attachRepoDisplayMetadata(definitionsRows) {
  if (!Array.isArray(definitionsRows) || definitionsRows.length === 0) {
    return [];
  }

  const repoIds = Array.from(new Set(definitionsRows
    .map((row) => Number(row?.repoId || 0))
    .filter((repoId) => Number.isInteger(repoId) && repoId > 0)));

  if (repoIds.length === 0) {
    return definitionsRows.map((row) => ({
      ...row,
      ...normalizeRepoDisplayMetadata(row, null),
    }));
  }

  const placeholders = repoIds.map(() => "?").join(", ");
  const repoRows = await allDb(
    `SELECT id, name, remoteUrl, localPath FROM asset_repos WHERE id IN (${placeholders})`,
    repoIds
  );
  const repoMap = new Map(repoRows.map((repoRow) => [Number(repoRow.id), repoRow]));

  return definitionsRows.map((row) => {
    const repoId = Number(row?.repoId || 0);
    const repoRow = repoMap.get(repoId) || null;
    return {
      ...row,
      ...normalizeRepoDisplayMetadata(row, repoRow),
    };
  });
}


function parseJsonArray(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}
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
      "SELECT id, key, name, description, tags, schema, version, type, filePath, source, repoId, repoName, inTeam, status FROM definitions"
    );
    const definitionsWithRepoMetadata = await attachRepoDisplayMetadata(definitionsRows);

    if (!currentDevProject) {
      res.json(definitionsWithRepoMetadata);
      return;
    }

    const copiedRows = await allDb(
      "SELECT definitionKey FROM project_definition_copies WHERE projectPath = ?",
      [currentDevProject]
    );
    const copiedKeys = new Set(copiedRows.map((row) => row.definitionKey));
    const rows = definitionsWithRepoMetadata.map((row) => ({ ...row, status: copiedKeys.has(row.key) ? "saved" : "repo" }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/definitions/suggestions", async (_req, res) => {
  try {
    const currentDevProject = String(await getSetting("currentDevProject") || "").trim();
    if (!currentDevProject) {
      res.json({ projectPath: "", projectType: "", projectTechnologies: [], suggestions: [] });
      return;
    }

    const projectRow = await getDb("SELECT projectType, detectedSignals, projectTechnologies FROM dev_projects WHERE path = ?", [currentDevProject]);
    const projectType = String(projectRow?.projectType || "").trim().toLowerCase();
    const detectedSignals = parseJsonArray(projectRow?.detectedSignals);
    const savedProjectTechnologies = parseJsonArray(projectRow?.projectTechnologies);
    const projectTechnologies = buildProjectTechnologyTokens(projectType, savedProjectTechnologies, detectedSignals);

    if (!projectType && projectTechnologies.length === 0) {
      res.json({ projectPath: currentDevProject, projectType, projectTechnologies, suggestions: [] });
      return;
    }

    const definitionsRows = await allDb(
      "SELECT id, key, name, description, tags, type FROM definitions"
    );

    const rankedSuggestions = recommendDefinitions(currentDevProject, projectType, definitionsRows, {
      projectTechnologies,
      detectedSignals
    })
      .map((definition) => ({
        definitionId: definition.id,
        score: definition.score,
        reasons: Array.isArray(definition.reasons) ? definition.reasons : []
      }));

    res.json({
      projectPath: currentDevProject,
      projectType,
      projectTechnologies,
      suggestions: rankedSuggestions
    });
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
      const [rowWithRepoMetadata] = await attachRepoDisplayMetadata([row]);
      res.json({ ...rowWithRepoMetadata, content, createdAt });
    }
  );
});


export default router;
