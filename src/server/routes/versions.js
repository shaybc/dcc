import express from "express";
import { getDb, runDb } from "../db/helpers.js";
import { getVersionHistory } from "../versions/cache.js";

const router = express.Router();

router.get("/api/definitions/:id/versions", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const versions = await getVersionHistory(definition);
    const responseVersions = versions.map((versionRow) => ({
      version: versionRow.version,
      commitHash: versionRow.commit_hash,
      commitMessage: versionRow.commit_message,
      commitAuthor: versionRow.commit_author,
      commitDate: versionRow.commit_date,
      isCurrent: String(versionRow.version) === String(definition.version || "")
    }));

    res.json({ versions: responseVersions, currentVersion: definition.version || "" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load version history." });
  }
});

router.get("/api/definitions/:id/versions/:version", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    await getVersionHistory(definition);
    const versionRow = await getDb(
      `SELECT version, content, metadata, commit_hash, commit_message, commit_author, commit_date
       FROM definition_versions WHERE definition_key = ? AND version = ?`,
      [definition.key, req.params.version]
    );

    if (!versionRow) {
      res.status(404).json({ error: "Version not found." });
      return;
    }

    let metadata = {};
    try {
      metadata = JSON.parse(versionRow.metadata || "{}") || {};
    } catch (_error) {
      metadata = {};
    }

    res.json({
      version: versionRow.version,
      content: versionRow.content,
      metadata,
      commitInfo: {
        hash: versionRow.commit_hash,
        message: versionRow.commit_message,
        author: versionRow.commit_author,
        date: versionRow.commit_date
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load version content." });
  }
});

router.post("/api/definitions/:id/versions/:version/restore", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    await getVersionHistory(definition);
    const versionRow = await getDb(
      "SELECT version, content FROM definition_versions WHERE definition_key = ? AND version = ?",
      [definition.key, req.params.version]
    );
    if (!versionRow) {
      res.status(404).json({ error: "Version not found." });
      return;
    }

    const createNewVersion = req.body?.createNewVersion !== false;
    const newVersion = createNewVersion ? bumpPatchVersion(definition.version) : versionRow.version;
    const contentToWrite = applyVersionToContent(versionRow.content, definition.filePath, newVersion);
    await fsp.writeFile(definition.filePath, contentToWrite, "utf8");

    const now = new Date().toISOString();
    await runDb(
      "UPDATE definitions SET content = ?, version = ?, updatedAt = ? WHERE id = ?",
      [contentToWrite, newVersion, now, definition.id]
    );

    try {
      await refreshDefinitionVersionCache({ ...definition, version: newVersion });
    } catch (_error) {
      // Best effort cache refresh.
    }

    res.json({
      success: true,
      newVersion,
      message: "Version restored successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to restore version." });
  }
});


export default router;
