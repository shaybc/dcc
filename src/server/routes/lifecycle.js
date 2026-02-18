import fs from "fs";
import path from "path";
import express from "express";
import YAML from "yaml";
import db from "../db/index.js";
import { getDb, runDb, allDb } from "../db/helpers.js";
import { runCommand, classifyGitError, extractCommandErrorMessage, handleGitTransactionFailure } from "../utils/git.js";
import { getSetting } from "../utils/settings.js";
import { ensureAssetRepoMigration, getAssetRepo, getEnabledAssetRepos } from "../utils/assetRepos.js";
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

      const duplicatedType = deriveType(targetPath, { type: row.type });
      const duplicatedKey = buildKey(duplicatedType, targetPath, { dccUri: nextDccUri });
      const duplicatedRow = await getDb("SELECT id FROM definitions WHERE key = ?", [duplicatedKey]);
      if (!duplicatedRow) {
        const fallbackRow = await getDb("SELECT id FROM definitions WHERE filePath = ?", [targetPath]);
        if (fallbackRow?.id) {
          res.json({ ok: true, id: fallbackRow.id, message: "Definition duplicated." });
          return;
        }
        console.error("[definition-duplicate] duplicated file indexed with unexpected key", {
          sourceId: row.id,
          expectedKey: duplicatedKey,
          filePath: targetPath,
          type: duplicatedType,
          dccUri: nextDccUri
        });
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

    try {
      await ensureAssetRepoMigration();
      const targetRepoId = Number(req.body?.targetRepoId);
      if (!Number.isInteger(targetRepoId) || targetRepoId <= 0) {
        res.status(400).json({ error: "targetRepoId is required." });
        return;
      }

      const targetRepo = await getAssetRepo(targetRepoId);
      if (!targetRepo || !targetRepo.enabled) {
        res.status(400).json({ error: "Selected asset repository is not available." });
        return;
      }

      const absoluteRepoPath = path.resolve(targetRepo.localPath || "");
      if (!absoluteRepoPath || !fs.existsSync(absoluteRepoPath)) {
        res.status(400).json({ error: "Selected repository path does not exist locally." });
        return;
      }

      const absoluteDefinitionPath = path.resolve(row.filePath || "");
      if (!fs.existsSync(absoluteDefinitionPath)) {
        await loadDefinitions();
        res.status(404).json({ error: "Definition file was not found." });
        return;
      }

      const enabledRepos = await getEnabledAssetRepos();
      const sourceRepo = enabledRepos
        .map((repo) => ({ ...repo, absolutePath: path.resolve(repo.localPath || "") }))
        .find((repo) => absoluteDefinitionPath.startsWith(`${repo.absolutePath}${path.sep}`));

      const insideTargetRepo = absoluteDefinitionPath.startsWith(`${absoluteRepoPath}${path.sep}`);
      const typeFolder = String(row.type || "misc").trim().toLowerCase() || "misc";
      let destinationPath = absoluteDefinitionPath;

      if (!insideTargetRepo) {
        const fileName = path.basename(absoluteDefinitionPath);
        const destinationDir = path.join(absoluteRepoPath, typeFolder);
        destinationPath = path.join(destinationDir, fileName);
        await fsp.mkdir(destinationDir, { recursive: true });

        if (fs.existsSync(destinationPath)) {
          const [existingContent, incomingContent] = await Promise.all([
            fsp.readFile(destinationPath, "utf8"),
            fsp.readFile(absoluteDefinitionPath, "utf8")
          ]);
          if (existingContent !== incomingContent) {
            res.status(409).json({ error: `Target definition file already exists: ${path.relative(absoluteRepoPath, destinationPath)}` });
            return;
          }
        } else {
          await fsp.copyFile(absoluteDefinitionPath, destinationPath);
        }
      }

      const commitMessage = String(req.body?.commitMessage || "").trim() || `Add definition ${row.name}`;
      const relativePath = path.relative(absoluteRepoPath, destinationPath);

      try {
        await runCommand("git pull", { cwd: absoluteRepoPath });
        await runCommand(`git add ${JSON.stringify(relativePath)}`, { cwd: absoluteRepoPath });
        await runCommand(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: absoluteRepoPath });
        await runCommand("git push", { cwd: absoluteRepoPath });
      } catch (error) {
        const failure = await handleGitTransactionFailure({
          error,
          cwd: absoluteRepoPath,
          run: runCommand,
          resetTo: "HEAD~1",
          pullRebase: true,
          reloadDefinitions: loadDefinitions,
          permissionMessage: "Push cancelled because you do not have permission to push to the selected upstream repository.",
          conflictMessage: "Push cancelled due to merge conflicts while syncing with upstream.",
          fallbackMessage: "Failed to push definition to upstream.",
        });

        const statusCode = failure.category === "permission" ? 403 : failure.category === "conflict" ? 409 : 500;
        res.status(statusCode).json({ error: failure.message });
        return;
      }

      await loadDefinitions();
      const updatedRow = await getDb(
        "SELECT id, key, filePath, source, repoId, repoName, status FROM definitions WHERE filePath = ? LIMIT 1",
        [destinationPath]
      );

      res.json({
        ok: true,
        message: "Definition pushed to upstream repository.",
        definition: updatedRow || null,
        origin: updatedRow ? {
          source: updatedRow.source,
          repoId: updatedRow.repoId,
          repoName: updatedRow.repoName,
          filePath: updatedRow.filePath
        } : null,
        movedFromRepoId: sourceRepo?.id || null,
        targetRepoId,
      });
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
        const promptUsesByDccUri = new Map();
        const promptDestinationInfo = (filePath) => getProjectDestinationInfo(currentDevProject, "prompts", filePath);

        const knownDefinitions = await allDb("SELECT content, filePath FROM definitions");
        const definitionsByDccUri = new Map();
        knownDefinitions.forEach((item) => {
          const dccUri = extractDccUriFromDefinitionContent(item?.content || "", { filePath: item?.filePath || "" });
          if (dccUri) {
            definitionsByDccUri.set(dccUri.toLowerCase(), item);
          }
        });

        const promptRefs = Array.isArray(configDoc.prompts) ? configDoc.prompts : [];
        for (const ref of promptRefs) {
          const dccUse = String(ref?.dcc_use || "").trim();
          if (!dccUse) continue;
          const referenced = definitionsByDccUri.get(dccUse.toLowerCase());
          if (!referenced?.filePath) continue;
          const destInfo = promptDestinationInfo(referenced.filePath);
          if (!destInfo) continue;
          await fsp.mkdir(destInfo.destDir, { recursive: true });
          const definitionContent = await fsp.readFile(referenced.filePath, "utf8");
          const sanitizedContent = stripDccProjectMetadata(definitionContent, referenced.filePath);
          await fsp.writeFile(destInfo.destPath, sanitizedContent, "utf8");
          const promptPath = destInfo.destPath.replace(/\\/g, "/");
          promptUsesByDccUri.set(dccUse.toLowerCase(), `file://${promptPath}`);
        }

        const mergedContent = await buildMergedConfigContent(configDoc, definitionsByDccUri, { promptUsesByDccUri });
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
      try {
        await runCommand("git pull", { cwd: repoPath });
        await fsp.copyFile(row.filePath, destPath);
        await runCommand(`git add ${destPath}`, { cwd: repoPath });
        await runCommand(`git commit -m "Add definition ${row.name}"`, { cwd: repoPath });
        await runCommand("git push", { cwd: repoPath });
      } catch (error) {
        const failure = await handleGitTransactionFailure({
          error,
          cwd: repoPath,
          run: runCommand,
          resetTo: "HEAD~1",
          pullRebase: true,
          reloadDefinitions: loadDefinitions,
          permissionMessage: "Publish cancelled because you do not have permission to push to the configured repository.",
          conflictMessage: "Publish cancelled due to merge conflicts while syncing the repository.",
          fallbackMessage: "Failed to publish definition.",
        });

        const statusCode = failure.category === "permission" ? 403 : failure.category === "conflict" ? 409 : 500;
        res.status(statusCode).json({ error: failure.message });
        return;
      }

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
