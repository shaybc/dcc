import express from "express";
import { listDefinitions, getContinueRoot } from "../services/configRepoService.js";

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
  res.json({ continueRoot: getContinueRoot() });
});
