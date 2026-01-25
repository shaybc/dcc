import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./utils/env.js";
import { authMiddleware } from "./utils/authMiddleware.js";
import { migrate } from "./db/migrate.js";
import { logInfo } from "./utils/logger.js";

import { configsRouter } from "./routes/configs.js";
import { workflowsRouter } from "./routes/workflows.js";
import { runsRouter } from "./routes/runs.js";
import { prRouter } from "./routes/pr.js";
import { openaiRouter } from "./routes/openai.js";
import { aiCallsRouter } from "./routes/aiCalls.js";

migrate();

const app = express();
app.use(helmet({
  // Allow local UI to call local API without CSP issues in dev
  contentSecurityPolicy: false
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

// Auth (optional shared token)
app.use(authMiddleware);

// API routes
app.use("/api/configs", configsRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/runs", runsRouter);
app.use("/api/pr", prRouter);
app.use("/v1", openaiRouter);
app.use("/api/ai-calls", aiCallsRouter);

// Static UI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/", express.static(path.join(__dirname, "ui")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  logInfo(`DCC listening on http://localhost:${env.PORT}`);
});
