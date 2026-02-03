import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./utils/env.js";
import { authMiddleware } from "./utils/authMiddleware.js";
import { migrate } from "./db/migrate.js";
import { logInfo } from "./utils/logger.js";

import { httpLogger } from "./middleware/httpLogger.js";

import { configsRouter } from "./routes/configs.js";
import { definitionsRouter } from "./routes/definitions.js";
import { workflowsRouter } from "./routes/workflows.js";
import { runsRouter } from "./routes/runs.js";
import { prRouter } from "./routes/pr.js";
import { openaiRouter } from "./routes/openai.js";
import { settingsRouter } from "./routes/settings.js";
import { hubDefinitionsRouter } from "./routes/hubDefinitions.js";

// optional (only if exists in your project)
import { aiCallsRouter } from "./routes/aiCalls.js";

migrate();

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));

// Add request logging to see what's being called
app.use((req, res, next) => {
  logInfo(`[DEBUG] ${req.method} ${req.path} Headers: ${JSON.stringify(req.headers)} Body: ${JSON.stringify(req.body)}`);
  next();
});

// HTTP logging (DEBUG MODE ON)
app.use(httpLogger({
  includeHeaders: true,
  includeBody: true,               // <-- ON for debugging Continue
  maxBodyChars: 6000,
  includeResponsePreview: true,    // <-- logs response preview
  maxResponsePreviewChars: 1200
}));

app.use(authMiddleware);

// OpenAI-compatible facade for Continue
app.use("/v1", openaiRouter);

// Existing DCC APIs
app.use("/api/configs", configsRouter);
app.use("/api/definitions", definitionsRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/runs", runsRouter);
app.use("/api/pr", prRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/hub/definitions", hubDefinitionsRouter);

// AI call history APIs
app.use("/api/ai-calls", aiCallsRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/", express.static(path.join(__dirname, "ui")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  logInfo(`DCC listening on http://localhost:${env.PORT}`);
});
