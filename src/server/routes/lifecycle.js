import fs from "fs";
import path from "path";
import express from "express";
import YAML from "yaml";
import db from "../db/index.js";
import { getDb, runDb, allDb } from "../db/helpers.js";
import { runCommand, classifyGitError, extractCommandErrorMessage } from "../utils/git.js";
import { getSetting } from "../utils/settings.js";
import { getProjectDestinationInfo, deriveConfigOutputFileName } from "../definitions/install.js";
import { upsertContextProviders, removeContextProviders, buildMergedConfigContent } from "../definitions/context.js";
import { stripDccProjectMetadata, extractDccUriFromDefinitionContent } from "../definitions/metadata.js";
import { updateDefinitionNameInContent, updateDefinitionMetadataInContent, sanitizeDuplicateFileName, sanitizeYamlHeaderScalars, bumpPatchVersion, applyVersionToContent } from "../definitions/content.js";
import { loadDefinitions } from "../definitions/index.js";
import { normalizeDefinitionType, buildKey, deriveType } from "../definitions/parse.js";
import { refreshDefinitionVersionCache } from "../versions/cache.js";

const fsp = fs.promises;
const router = express.Router();

router.post("/api/definitions/:id/duplicate", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const nextName = String(req.body?.name || "").trim();
    if (!nextName) {
      res.status(400).json({ error: "Definition name is required." });
      return;
    }

    const nextFileName = sanitizeDuplicateFileName(req.body?.fileName);
    if (!nextFileName) {
      res.status(400).json({ error: "Definition file name is required." });
      return;
    }

    const nextDccUri = String(req.body?.dccUri || "").trim();
    if (!nextDccUri) {
      res.status(400).json({ error: "Definition dcc_uri is required." });
      return;
    }

    const sourceFilePath = path.resolve(row.filePath || "");
    if (!fs.existsSync(sourceFilePath)) {
      await loadDefinitions();
      res.status(404).json({ error: "Definition file was not found." });
      return;
    }

    const targetDir = path.dirname(sourceFilePath);
    const targetPath = path.join(targetDir, nextFileName);
    if (fs.existsSync(targetPath)) {
      res.status(409).json({ error: "A definition file with that name already exists." });
      return;
    }

    try {
      const originalContent = await fsp.readFile(sourceFilePath, "utf8");
      const requestedContent = String(req.body?.content || "");
      const baseContent = requestedContent.trim() ? requestedContent : updateDefinitionNameInContent(originalContent, nextFileName, nextName);
      const duplicatedContent = updateDefinitionMetadataInContent(baseContent, nextFileName, {
        name: nextName,
        dccUri: nextDccUri
      });
      await fsp.writeFile(targetPath, duplicatedContent, "utf8");

      await loadDefinitions();

      const duplicatedKey = buildKey(deriveType(targetPath, { type: row.type }), targetPath);
      const duplicatedRow = await getDb("SELECT id FROM definitions WHERE key = ?", [duplicatedKey]);
      if (!duplicatedRow) {
        res.status(500).json({ error: "Definition duplicated but could not be indexed." });
        return;
      }

      res.json({ ok: true, id: duplicatedRow.id, message: "Definition duplicated." });
    } catch (error) {
      res.status(500).json({ error: error.message || "Unable to duplicate definition." });
    }
  });
});

router.post("/api/definitions/:id/push-upstream", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const source = String(row.source || "").toLowerCase();
    if (source === "repo") {
      res.status(400).json({ error: "Definition is already tracked in the repository." });
      return;
    }

    const absoluteRepoPath = path.resolve(repoPath);
    const absoluteDefinitionPath = path.resolve(row.filePath || "");
    if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
      res.status(400).json({ error: "Definition file is not in the configured repository." });
      return;
    }

    if (!fs.existsSync(absoluteDefinitionPath)) {
      await loadDefinitions();
      res.status(404).json({ error: "Definition file was not found in the repository." });
      return;
    }

    const commitMessage = String(req.body?.commitMessage || "").trim() || `Add definition ${row.name}`;
    const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath);

    try {
      await runCommand("git pull", { cwd: absoluteRepoPath });
      await runCommand(`git add ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
      await runCommand(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: absoluteRepoPath });
      await runCommand("git push", { cwd: absoluteRepoPath });
      await loadDefinitions();
      res.json({ ok: true, message: "Definition pushed to upstream repository." });
    } catch (error) {
      res.status(500).json({ error: extractCommandErrorMessage(error, "Failed to push definition to upstream.") });
    }
  });
});

router.post("/api/definitions/:id/save", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    let currentDevProject = null;
    try {
      currentDevProject = await getSetting("currentDevProject");
      if (!currentDevProject) {
        res.status(400).json({ error: "Current dev project not selected." });
        return;
      }

      const normalizedType = normalizeDefinitionType(row.type);
      if (normalizedType === "context") {
        console.log(`[definition-save] saving context definition id=${row.id} key=${row.key} project=${currentDevProject}`);
        await upsertContextProviders(currentDevProject, row.content || "");
      } else if (normalizedType === "configs") {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        const configFileName = deriveConfigOutputFileName(row.filePath || "");
        await fsp.mkdir(destinationInfo.destDir, { recursive: true });

        const configDoc = YAML.parse(sanitizeYamlHeaderScalars(row.content || "")) || {};

        const knownDefinitions = await allDb("SELECT content, filePath FROM definitions");
        const definitionsByDccUri = new Map();
        knownDefinitions.forEach((item) => {
          const dccUri = extractDccUriFromDefinitionContent(item?.content || "", { filePath: item?.filePath || "" });
          if (dccUri) {
            definitionsByDccUri.set(dccUri.toLowerCase(), item);
          }
        });

        const mergedContent = await buildMergedConfigContent(configDoc, definitionsByDccUri);
        const configDestPath = path.join(destinationInfo.destDir, configFileName);
        await fsp.writeFile(configDestPath, mergedContent, "utf8");
      } else {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        await fsp.mkdir(destinationInfo.destDir, { recursive: true });
        const definitionContent = await fsp.readFile(row.filePath, "utf8");
        const sanitizedContent = stripDccProjectMetadata(definitionContent, row.filePath);
        await fsp.writeFile(destinationInfo.destPath, sanitizedContent, "utf8");
      }

      await runDb(
        "INSERT OR IGNORE INTO project_definition_copies (projectPath, definitionKey, copiedAt) VALUES (?, ?, ?)",
        [currentDevProject, row.key, new Date().toISOString()]
      );
      db.run(
        "UPDATE definitions SET inTeam = 1, status = 'saved' WHERE id = ?",
        [row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      console.error("[definition-save] failed to save definition", {
        id: row.id,
        key: row.key,
        type: row.type,
        project: currentDevProject,
        error
      });
      res.status(500).json({ error: error.message });
    }
  });
});

router.post("/api/definitions/:id/publish", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    try {
      const repoPath = await getSetting("repoPath");
      if (!repoPath) {
        res.status(400).json({ error: "Repo path not configured." });
        return;
      }
      const typeFolder = row.type || "misc";
      const destDir = path.join(repoPath, typeFolder);
      await fsp.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, path.basename(row.filePath));
      await runCommand("git pull", { cwd: repoPath });
      await fsp.copyFile(row.filePath, destPath);
      await runCommand(`git add ${destPath}`, { cwd: repoPath });
      await runCommand(`git commit -m "Add definition ${row.name}"`, { cwd: repoPath });
      await runCommand("git push", { cwd: repoPath });

      db.run(
        "UPDATE definitions SET filePath = ?, source = 'repo', status = 'saved', inTeam = 1 WHERE id = ?",
        [destPath, row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});


router.post("/api/definitions/:id/delete-repo", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const absoluteDefinitionPath = path.resolve(row.filePath || "");
    const isUntrackedDefinition = String(row.source || "").toLowerCase() === "untracked";

    if (isUntrackedDefinition) {
      if (!fs.existsSync(absoluteDefinitionPath)) {
        await loadDefinitions();
        res.status(404).json({ error: "Definition file was not found in local files." });
        return;
      }

      try {
        await fsp.unlink(absoluteDefinitionPath);
        await loadDefinitions();
        res.json({
          ok: true,
          message: "Definition deleted from local files.",
        });
      } catch (deleteError) {
        await loadDefinitions();
        res.status(500).json({ error: deleteError.message || "Failed to delete local definition file." });
      }
      return;
    }

    const repoPath = await getSetting("repoPath");
    if (!repoPath) {
      res.status(400).json({ error: "Repo path not configured." });
      return;
    }

    const absoluteRepoPath = path.resolve(repoPath);
    if (!absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`)) {
      res.status(400).json({ error: "Definition file is not in the configured repository." });
      return;
    }

    const relativePath = path.relative(absoluteRepoPath, absoluteDefinitionPath);

    try {
      await runCommand("git pull", { cwd: absoluteRepoPath });
    } catch (pullError) {
      if (classifyGitError(pullError) === "conflict") {
        try {
          await runCommand("git reset --hard HEAD", { cwd: absoluteRepoPath });
          await runCommand("git clean -fd", { cwd: absoluteRepoPath });
          await runCommand("git pull --rebase", { cwd: absoluteRepoPath });
          await loadDefinitions();
        } catch (_rollbackError) {}

        res.status(409).json({
          error: "Deletion cancelled due to merge conflicts while syncing the repository. Please resolve this deletion manually in the Git repository.",
        });
        return;
      }
      res.status(500).json({ error: extractCommandErrorMessage(pullError, "Failed to sync repository before deletion.") });
      return;
    }

    if (!fs.existsSync(absoluteDefinitionPath)) {
      await loadDefinitions();
      res.status(404).json({ error: "Definition file was not found in the repository." });
      return;
    }

    try {
      await fsp.unlink(absoluteDefinitionPath);
      await runCommand(`git add ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
      await runCommand(`git commit -m "Delete definition ${row.name}"`, { cwd: absoluteRepoPath });
    } catch (localError) {
      try {
        await runCommand("git reset --hard HEAD", { cwd: absoluteRepoPath });
        await runCommand("git clean -fd", { cwd: absoluteRepoPath });
      } catch (_resetError) {}
      await loadDefinitions();
      res.status(500).json({ error: extractCommandErrorMessage(localError, "Failed to prepare deletion commit.") });
      return;
    }

    try {
      await runCommand("git push", { cwd: absoluteRepoPath });
      await loadDefinitions();
      res.json({
        ok: true,
        message: "Definition deleted from the cloned repository and pushed to the team repository.",
      });
    } catch (pushError) {
      const category = classifyGitError(pushError);
      try {
        await runCommand("git reset --hard HEAD~1", { cwd: absoluteRepoPath });
        await runCommand("git clean -fd", { cwd: absoluteRepoPath });
        await runCommand("git pull --rebase", { cwd: absoluteRepoPath });
        await loadDefinitions();
      } catch (_rollbackError) {
        try {
          await loadDefinitions();
        } catch (_loadError) {}
      }

      if (category === "permission") {
        res.status(403).json({
          error: "Deletion was cancelled because you do not have permission to push this change. Ask the DCC administrators if you need this permission.",
        });
        return;
      }

      if (category === "conflict") {
        res.status(409).json({
          error: "Deletion cancelled due to merge conflicts while pushing. Please resolve this deletion manually in the Git repository.",
        });
        return;
      }

      res.status(500).json({ error: extractCommandErrorMessage(pushError, "Failed to push deletion commit.") });
    }
  });
});

router.post("/api/definitions/:id/remove", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    let currentDevProject = null;
    try {
      currentDevProject = await getSetting("currentDevProject");
      if (!currentDevProject) {
        res.status(400).json({ error: "Current dev project not selected." });
        return;
      }

      const normalizedType = normalizeDefinitionType(row.type);
      if (normalizedType === "context") {
        await removeContextProviders(currentDevProject, row.content || "");
      } else if (normalizedType === "configs") {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        const configFileName = deriveConfigOutputFileName(row.filePath || "");
        const configDestPath = path.join(destinationInfo.destDir, configFileName);
        if (fs.existsSync(configDestPath)) {
          await fsp.unlink(configDestPath);
        }
      } else {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        if (fs.existsSync(destinationInfo.destPath)) {
          await fsp.unlink(destinationInfo.destPath);
        }
      }

      await runDb(
        "DELETE FROM project_definition_copies WHERE projectPath = ? AND definitionKey = ?",
        [currentDevProject, row.key]
      );

      db.run(
        "UPDATE definitions SET inTeam = 0, status = 'repo' WHERE id = ?",
        [row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});


export default router;
