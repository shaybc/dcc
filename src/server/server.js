import path from "path";
import fs from "fs/promises";
import express from "express";
import YAML from "yaml";
import "./db/index.js";
import openaiRouter from "./routes/openai.js";
import editorRouter from "./routes/editor.js";
import settingsRouter from "./routes/settings.js";
import projectsRouter from "./routes/projects.js";
import repoRouter from "./routes/repo.js";
import definitionsRouter from "./routes/definitions.js";
import lifecycleRouter from "./routes/lifecycle.js";
import validationRouter from "./routes/validation.js";
import versionsRouter from "./routes/versions.js";
import agentRunPacksRouter from "./routes/agentRunPacks.js";
import agentRunsRouter from "./routes/agentRuns.js";
import { loadAiLogConfigFromSettings } from "./utils/aiLogging.js";
import { loadLoggerFileConfigFromSettings } from "./utils/logger.js";
import { isAgentFeatureEnabled } from "./utils/env.js";

const __dirname = import.meta.dirname;
const app = express();
const PORT = process.env.PORT || 3000;

// increase request body limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Permissions-Policy", "file-system-access=(self)");
  }
}));

app.get("/runtime-config.js", (_req, res) => {
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__DCC_RUNTIME_CONFIG = Object.freeze({ enableAgent: ${isAgentFeatureEnabled} });`);
});

app.get("/docs/swagger/dcc-server-openapi.yaml", async (_req, res, next) => {
  try {
    const openApiPath = path.join(__dirname, "../../docs/swagger/dcc-server-openapi.yaml");
    if (isAgentFeatureEnabled) {
      res.sendFile(openApiPath);
      return;
    }

    const raw = await fs.readFile(openApiPath, "utf8");
    const openApi = YAML.parse(raw);

    delete openApi?.paths?.["/api/agent-run-packs"];
    delete openApi?.paths?.["/api/agent-runs"];
    delete openApi?.paths?.["/api/agent-runs/debug"];
    delete openApi?.paths?.["/api/agent-runs/{runId}"];
    delete openApi?.paths?.["/api/agent-runs/{runId}/logs"];
    delete openApi?.paths?.["/api/agent-runs/{runId}/stream"];
    delete openApi?.paths?.["/api/agent-runs/{runId}/kill"];
    if (Array.isArray(openApi?.tags)) {
      openApi.tags = openApi.tags.filter((tag) => !["Agent Runs", "Agent Run Packs"].includes(tag?.name));
    }

    res.type("application/yaml");
    res.send(YAML.stringify(openApi));
  } catch (error) {
    next(error);
  }
});

app.use("/docs", express.static(path.join(__dirname, "../../docs"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
}));

app.use("/v1", openaiRouter);
app.use(editorRouter);
app.use(settingsRouter);
app.use(projectsRouter);
app.use(repoRouter);
app.use(definitionsRouter);
app.use(lifecycleRouter);
app.use(validationRouter);
app.use(versionsRouter);
if (isAgentFeatureEnabled) {
  app.use(agentRunPacksRouter);
  app.use(agentRunsRouter);
}

app.get("/swagger", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/swagger.html"));
});

app.get("/settings", (req, res) => {
  res.redirect("/?tab=settings");
});

await loadAiLogConfigFromSettings();
await loadLoggerFileConfigFromSettings();

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
