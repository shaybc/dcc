import express from "express";
import { listDefinitions, getContinueRoot, createDefinition, getLocalContinueRoot } from "../services/configRepoService.js";

export const configsRouter = express.Router();

/**
 * Lists available definitions in the local config repo clone.
 */
configsRouter.get("/", (req, res) => {
  res.json(listDefinitions());
});

/**
 * Returns the configured continue root path for debugging.
 */
configsRouter.get("/root", (req, res) => {
  res.json({ continueRoot: getContinueRoot(), localContinueRoot: getLocalContinueRoot() });
});

configsRouter.post("/definitions", async (req, res) => {
  try {
    const result = await createDefinition(req.body || {});
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});
