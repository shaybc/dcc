import path from "path";
import express from "express";
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
import { loadAiLogConfigFromSettings } from "./utils/aiLogging.js";

const __dirname = import.meta.dirname;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
}));
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
app.use(agentRunPacksRouter);

app.get("/swagger", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/swagger.html"));
});

app.get("/settings", (req, res) => {
  res.redirect("/?tab=settings");
});

await loadAiLogConfigFromSettings();

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
