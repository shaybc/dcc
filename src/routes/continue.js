import express from "express";
import { removeContinueDefinition, saveContinueDefinition } from "../services/continueDefinitionsService.js";

export const continueRouter = express.Router();

continueRouter.post("/definitions", (req, res) => {
  try {
    const { action, typeFolder, fileName, content } = req.body || {};
    if (action === "remove") {
      const result = removeContinueDefinition({ typeFolder, fileName });
      return res.json({ ok: true, ...result });
    }
    const result = saveContinueDefinition({ typeFolder, fileName, content });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});
