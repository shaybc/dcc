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

const __dirname = import.meta.dirname;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
}));

app.use("/v1", openaiRouter);
app.use("/api", editorRouter);
app.use("/api", settingsRouter);
app.use("/api", projectsRouter);
app.use("/api", repoRouter);
app.use("/api", definitionsRouter);
app.use("/api", lifecycleRouter);
app.use("/api", validationRouter);
app.use("/api", versionsRouter);

app.get("/settings", (req, res) => {
  res.redirect("/?tab=settings");
});

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
