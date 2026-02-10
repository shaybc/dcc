import fs from "fs";
import express from "express";
import { getDb, allDb, runDb } from "../db/helpers.js";
import { validateDefinition } from "../definitions/validateDefinition.js";

const fsp = fs.promises;
const router = express.Router();

router.post("/api/definitions/:id/validate", async (req, res) => {
  try {
    const definition = await getDb("SELECT * FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    let content = definition.content || "";
    if (definition.filePath && fs.existsSync(definition.filePath)) {
      try {
        content = await fsp.readFile(definition.filePath, "utf8");
      } catch (_error) {
        content = definition.content || "";
      }
    }

    const knownDefinitions = await allDb("SELECT key, name, type FROM definitions");
    const result = validateDefinition({
      definition: { ...definition, content },
      options: req.body?.options || {},
      knownDefinitions,
    });

    await runDb(
      `INSERT INTO validation_results (definition_key, definition_version, status, duration_ms, report_json)
       VALUES (?, ?, ?, ?, ?)`,
      [definition.key, definition.version || null, result.status, result.durationMs, JSON.stringify(result)]
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Validation failed." });
  }
});

router.get("/api/definitions/:id/validate/latest", async (req, res) => {
  try {
    const definition = await getDb("SELECT key FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const latest = await getDb(
      `SELECT report_json, created_at FROM validation_results
       WHERE definition_key = ?
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT 1`,
      [definition.key]
    );

    if (!latest) {
      res.json({ found: false, result: null });
      return;
    }

    res.json({ found: true, result: JSON.parse(latest.report_json), createdAt: latest.created_at });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load latest validation." });
  }
});

router.get("/api/definitions/:id/validate/history", async (req, res) => {
  try {
    const definition = await getDb("SELECT key FROM definitions WHERE id = ?", [req.params.id]);
    if (!definition) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 20;

    const history = await allDb(
      `SELECT id, status, duration_ms, report_json, created_at
       FROM validation_results
       WHERE definition_key = ?
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT ?`,
      [definition.key, limit]
    );

    res.json({
      history: history.map((entry) => ({
        id: entry.id,
        status: entry.status,
        durationMs: entry.duration_ms,
        createdAt: entry.created_at,
        result: JSON.parse(entry.report_json),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to load validation history." });
  }
});


export default router;
