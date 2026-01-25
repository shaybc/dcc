import express from "express";
import { listRuns, getRun } from "../services/runHistoryService.js";

export const runsRouter = express.Router();

runsRouter.get("/", (req, res) => {
  const limit = Number(req.query.limit || 50);
  res.json({ runs: listRuns({ limit }) });
});

runsRouter.get("/:id", (req, res) => {
  res.json(getRun(req.params.id));
});
