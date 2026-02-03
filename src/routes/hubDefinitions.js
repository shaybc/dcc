import express from "express";
import { removeHubDefinition, saveHubDefinition } from "../services/hubContinueService.js";

export const hubDefinitionsRouter = express.Router();

hubDefinitionsRouter.post("/", (req, res) => {
  const { action, definition } = req.body || {};
  if (!definition || typeof definition !== "object") {
    return res.status(400).json({ error: "definition payload is required." });
  }
  if (action !== "save" && action !== "remove") {
    return res.status(400).json({ error: "action must be 'save' or 'remove'." });
  }
  try {
    const result = action === "save" ? saveHubDefinition(definition) : removeHubDefinition(definition);
    const message =
      action === "save"
        ? "Definition saved to your Continue team folder."
        : "Definition removed from your Continue team folder.";
    return res.json({ ok: true, message, result });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to update Continue team folder." });
  }
});
