import express from "express";
import { loadAllDefinitions } from "../services/definitionLoaders/definitionLoader.js";
import { listDefinitions } from "../services/definitionsStore.js";

export const definitionsRouter = express.Router();

definitionsRouter.get("/", (req, res) => {
  const definitions = listDefinitions();
  res.json({ ok: true, definitions });
});

definitionsRouter.post("/load", (req, res) => {
  const result = loadAllDefinitions();
  res.json({ ok: true, ...result });
});
