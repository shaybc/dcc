import openaiRouter from "./routes/openai.js";

import path from "path";
import fs from "fs";
const fsp = fs.promises;
import os from "os";
import { exec } from "child_process";
import express from "express";
import sqliteUV from "sqlite3";
import matter from "gray-matter";
import YAML from "yaml";
const __dirname = import.meta.dirname;

const sqlite3 = sqliteUV.verbose();
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DCC_DB_PATH || path.join(__dirname, "../../data", "dcc.sqlite");
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      name TEXT,
      description TEXT,
      schema TEXT,
      version TEXT,
      content TEXT,
      type TEXT,
      filePath TEXT,
      source TEXT,
      inTeam INTEGER DEFAULT 0,
      status TEXT,
      updatedAt TEXT
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS dev_project_roots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS dev_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS project_definition_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectPath TEXT NOT NULL,
      definitionKey TEXT NOT NULL,
      copiedAt TEXT,
      UNIQUE(projectPath, definitionKey)
    )`
  );
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

// OpenAI-compatible facade for Continue
app.use("/v1", openaiRouter);

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row ? row.value : null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

function runDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function allDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function walkFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function deriveType(filePath, data) {
  if (data && data.type) {
    return String(data.type).toLowerCase();
  }
  const parts = filePath.split(path.sep);
  const folder = parts[parts.length - 2] || "unknown";
  return folder.toLowerCase();
}

function buildKey(type, filePath) {
  return `${type}/${path.basename(filePath)}`;
}

async function parseDefinition(filePath) {
  const raw = await fsp.readFile(filePath, "utf8");
  let parsed = { data: {}, content: raw };
  try {
    parsed = matter(raw);
  } catch (error) {
    parsed = { data: {}, content: raw };
  }
  const type = deriveType(filePath, parsed.data);
  const name = parsed.data.name || path.basename(filePath);
  const description = parsed.data.description || "";
  const schema = parsed.data.schema || "";
  const version = parsed.data.version || "";
  return {
    name,
    description,
    schema,
    version,
    content: parsed.content,
    type,
    filePath,
    key: buildKey(type, filePath)
  };
}

function getTeamRoot() {
  return path.join(os.homedir(), ".continue", "team");
}

function normalizeDefinitionType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  if (["rule", "rules"].includes(normalized)) return "rules";
  if (["prompt", "prompts"].includes(normalized)) return "prompts";
  if (["workflow", "workflows"].includes(normalized)) return "workflows";
  if (["model", "models"].includes(normalized)) return "models";
  if (["agent", "agents"].includes(normalized)) return "agents";
  if (["mcp server", "mcp servers", "mcpserver", "mcpservers"].includes(normalized)) return "mcpservers";
  if (["context", "contexts"].includes(normalized)) return "context";
  return normalized;
}

function getProjectDestinationInfo(projectPath, type, filePath) {
  const normalizedType = normalizeDefinitionType(type);
  const fileName = path.basename(filePath || "");
  const mappings = {
    rules: ["rules", "rules"],
    prompts: ["rules", "prompts"],
    workflows: ["workflows", "workflows"],
    models: ["models", "models"],
    agents: ["agents", "agents"],
    mcpservers: ["mcpServers", "mcpServers"]
  };
  const mapped = mappings[normalizedType];
  if (!mapped) {
    return null;
  }
  const [continueFolder, typeFolder] = mapped;
  const destDir = path.join(projectPath, ".continue", continueFolder, "team", typeFolder);
  return { destDir, destPath: path.join(destDir, fileName), normalizedType };
}

function parseContextProviders(content) {
  const parsed = YAML.parse(content);
  if (!parsed) {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed.filter((item) => item && typeof item === "object" && item.provider);
  }
  if (parsed.context && Array.isArray(parsed.context)) {
    return parsed.context.filter((item) => item && typeof item === "object" && item.provider);
  }
  if (parsed.provider) {
    return [parsed];
  }
  return [];
}

async function upsertContextProviders(projectPath, content) {
  const configPath = path.join(projectPath, ".continue", "config.yaml");
  await fsp.mkdir(path.dirname(configPath), { recursive: true });

  let configDoc = {};
  if (fs.existsSync(configPath)) {
    const existingRaw = await fsp.readFile(configPath, "utf8");
    configDoc = YAML.parse(existingRaw) || {};
  }
  if (!Array.isArray(configDoc.context)) {
    configDoc.context = [];
  }

  const providersToAdd = parseContextProviders(content);
  const existingProviders = new Set(
    configDoc.context
      .filter((item) => item && typeof item === "object" && item.provider)
      .map((item) => String(item.provider))
  );

  let changed = false;
  for (const providerDef of providersToAdd) {
    const providerName = String(providerDef.provider);
    if (existingProviders.has(providerName)) {
      continue;
    }
    configDoc.context.push(providerDef);
    existingProviders.add(providerName);
    changed = true;
  }

  if (changed) {
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
  }
}

async function removeContextProviders(projectPath, content) {
  const configPath = path.join(projectPath, ".continue", "config.yaml");
  if (!fs.existsSync(configPath)) {
    return;
  }
  const existingRaw = await fsp.readFile(configPath, "utf8");
  const configDoc = YAML.parse(existingRaw) || {};
  if (!Array.isArray(configDoc.context)) {
    return;
  }

  const providersToRemove = new Set(parseContextProviders(content).map((providerDef) => String(providerDef.provider)));
  if (providersToRemove.size === 0) {
    return;
  }

  const nextContext = configDoc.context.filter((item) => {
    if (!item || typeof item !== "object" || !item.provider) {
      return true;
    }
    return !providersToRemove.has(String(item.provider));
  });

  if (nextContext.length !== configDoc.context.length) {
    configDoc.context = nextContext;
    await fsp.writeFile(configPath, YAML.stringify(configDoc), "utf8");
  }
}

async function collectTeamFiles() {
  const teamRoot = getTeamRoot();
  if (!fs.existsSync(teamRoot)) {
    return [];
  }
  return walkFiles(teamRoot);
}

async function loadDefinitions() {
  const repoPath = await getSetting("repoPath");
  if (!repoPath || !fs.existsSync(repoPath)) {
    throw new Error("Repo path not found. Configure settings and clone the repo first.");
  }

  const repoFiles = await walkFiles(repoPath);
  const teamFiles = await collectTeamFiles();

  const teamKeyMap = new Set();
  for (const file of teamFiles) {
    const type = path.basename(path.dirname(file)).toLowerCase();
    const key = buildKey(type, file);
    teamKeyMap.add(key);
  }

  const now = new Date().toISOString();

  for (const filePath of repoFiles) {
    if (filePath.includes(path.join(repoPath, ".git"))) {
      continue;
    }
    const definition = await parseDefinition(filePath);
    const inTeam = teamKeyMap.has(definition.key) ? 1 : 0;
    const status = inTeam ? "saved" : "repo";

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO definitions
          (key, name, description, schema, version, content, type, filePath, source, inTeam, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            schema = excluded.schema,
            version = excluded.version,
            content = excluded.content,
            type = excluded.type,
            filePath = excluded.filePath,
            source = excluded.source,
            inTeam = excluded.inTeam,
            status = excluded.status,
            updatedAt = excluded.updatedAt
        `,
        [
          definition.key,
          definition.name,
          definition.description,
          definition.schema,
          definition.version,
          definition.content,
          definition.type,
          definition.filePath,
          "repo",
          inTeam,
          status,
          now
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  for (const filePath of teamFiles) {
    const type = path.basename(path.dirname(filePath)).toLowerCase();
    const key = buildKey(type, filePath);
    if (repoFiles.some((repoFile) => buildKey(type, repoFile) === key)) {
      continue;
    }
    const definition = await parseDefinition(filePath);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO definitions
          (key, name, description, schema, version, content, type, filePath, source, inTeam, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            schema = excluded.schema,
            version = excluded.version,
            content = excluded.content,
            type = excluded.type,
            filePath = excluded.filePath,
            source = excluded.source,
            inTeam = excluded.inTeam,
            status = excluded.status,
            updatedAt = excluded.updatedAt
        `,
        [
          key,
          definition.name,
          definition.description,
          definition.schema,
          definition.version,
          definition.content,
          type,
          filePath,
          "team",
          1,
          "local-only",
          now
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  return { repoCount: repoFiles.length, teamCount: teamFiles.length };
}

async function scanDevProjects(roots) {
  const projects = new Set();

  async function scanDir(dir) {
    let stat;
    try {
      stat = await fsp.stat(dir);
    } catch (error) {
      return;
    }
    if (!stat.isDirectory()) {
      return;
    }

    const gitPath = path.join(dir, ".git");
    try {
      const gitStat = await fsp.stat(gitPath);
      if (gitStat.isDirectory()) {
        projects.add(dir);
        return;
      }
    } catch (error) {
      // ignore missing .git
    }

    let entries = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await scanDir(path.join(dir, entry.name));
      }
    }
  }

  for (const root of roots) {
    if (!root) {
      continue;
    }
    await scanDir(root);
  }

  return Array.from(projects).sort();
}

async function refreshDevProjects(roots) {
  const projects = await scanDevProjects(roots);
  await runDb("DELETE FROM dev_projects");
  for (const project of projects) {
    await runDb("INSERT OR IGNORE INTO dev_projects (path) VALUES (?)", [project]);
  }
  return projects;
}

app.get("/api/settings", async (req, res) => {
  try {
    const repoUrl = await getSetting("repoUrl");
    const repoPath = await getSetting("repoPath");
    res.json({ repoUrl: repoUrl || "", repoPath: repoPath || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  const { repoUrl, repoPath } = req.body;
  try {
    if (repoUrl !== undefined) {
      await setSetting("repoUrl", repoUrl);
    }
    if (repoPath !== undefined) {
      await setSetting("repoPath", repoPath);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/current-dev-project", async (req, res) => {
  try {
    const path = await getSetting("currentDevProject");
    res.json({ path: path || "" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/current-dev-project", async (req, res) => {
  try {
    const path = String(req.body?.path || "").trim();
    await setSetting("currentDevProject", path);
    res.json({ ok: true, path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/dev-project-roots", async (req, res) => {
  try {
    const rows = await allDb("SELECT id, path FROM dev_project_roots ORDER BY path ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/dev-project-roots", async (req, res) => {
  try {
    const roots = Array.isArray(req.body?.roots) ? req.body.roots : [];
    await runDb("DELETE FROM dev_project_roots");
    for (const root of roots) {
      const trimmed = String(root || "").trim();
      if (!trimmed) {
        continue;
      }
      await runDb("INSERT OR IGNORE INTO dev_project_roots (path) VALUES (?)", [trimmed]);
    }
    const projects = await refreshDevProjects(roots.map((root) => String(root || "").trim()).filter(Boolean));
    res.json({ ok: true, projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/dev-projects", async (req, res) => {
  try {
    const rows = await allDb("SELECT id, path FROM dev_projects ORDER BY path ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clone-pull", async (req, res) => {
  try {
    const repoUrl = await getSetting("repoUrl");
    const repoPath = await getSetting("repoPath");
    if (!repoUrl || !repoPath) {
      res.status(400).json({ error: "Missing repoUrl or repoPath in settings." });
      return;
    }

    if (!fs.existsSync(repoPath)) {
      await runCommand(`git clone ${repoUrl} ${repoPath}`);
    } else {
      await runCommand("git pull", { cwd: repoPath });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/load-definitions", async (req, res) => {
  try {
    const result = await loadDefinitions();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/definitions", async (req, res) => {
  try {
    const currentDevProject = await getSetting("currentDevProject");
    const definitionsRows = await allDb(
      "SELECT id, key, name, description, schema, version, type, filePath, source, inTeam, status FROM definitions"
    );

    if (!currentDevProject) {
      const rows = definitionsRows.map((row) => ({ ...row, status: "repo" }));
      res.json(rows);
      return;
    }

    const copiedRows = await allDb(
      "SELECT definitionKey FROM project_definition_copies WHERE projectPath = ?",
      [currentDevProject]
    );
    const copiedKeys = new Set(copiedRows.map((row) => row.definitionKey));
    const rows = definitionsRows.map((row) => ({ ...row, status: copiedKeys.has(row.key) ? "saved" : "repo" }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/definitions/:id", (req, res) => {
  db.get(
    "SELECT * FROM definitions WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    }
  );
});

app.post("/api/definitions/:id/save", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    try {
      const currentDevProject = await getSetting("currentDevProject");
      if (!currentDevProject) {
        res.status(400).json({ error: "Current dev project not selected." });
        return;
      }

      const normalizedType = normalizeDefinitionType(row.type);
      if (normalizedType === "context") {
        await upsertContextProviders(currentDevProject, row.content || "");
      } else {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        await fsp.mkdir(destinationInfo.destDir, { recursive: true });
        await fsp.copyFile(row.filePath, destinationInfo.destPath);
      }

      await runDb(
        "INSERT OR IGNORE INTO project_definition_copies (projectPath, definitionKey, copiedAt) VALUES (?, ?, ?)",
        [currentDevProject, row.key, new Date().toISOString()]
      );
      db.run(
        "UPDATE definitions SET inTeam = 1, status = 'saved' WHERE id = ?",
        [row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.post("/api/definitions/:id/publish", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    try {
      const repoPath = await getSetting("repoPath");
      if (!repoPath) {
        res.status(400).json({ error: "Repo path not configured." });
        return;
      }
      const typeFolder = row.type || "misc";
      const destDir = path.join(repoPath, typeFolder);
      await fsp.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, path.basename(row.filePath));
      await runCommand("git pull", { cwd: repoPath });
      await fsp.copyFile(row.filePath, destPath);
      await runCommand(`git add ${destPath}`, { cwd: repoPath });
      await runCommand(`git commit -m "Add definition ${row.name}"`, { cwd: repoPath });
      await runCommand("git push", { cwd: repoPath });

      db.run(
        "UPDATE definitions SET filePath = ?, source = 'repo', status = 'saved', inTeam = 1 WHERE id = ?",
        [destPath, row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.post("/api/definitions/:id/remove", async (req, res) => {
  db.get("SELECT * FROM definitions WHERE id = ?", [req.params.id], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Definition not found." });
      return;
    }
    try {
      const currentDevProject = await getSetting("currentDevProject");
      if (!currentDevProject) {
        res.status(400).json({ error: "Current dev project not selected." });
        return;
      }

      const normalizedType = normalizeDefinitionType(row.type);
      if (normalizedType === "context") {
        await removeContextProviders(currentDevProject, row.content || "");
      } else {
        const destinationInfo = getProjectDestinationInfo(currentDevProject, row.type, row.filePath);
        if (!destinationInfo) {
          res.status(400).json({ error: `Unsupported definition type: ${row.type}` });
          return;
        }
        if (fs.existsSync(destinationInfo.destPath)) {
          await fsp.unlink(destinationInfo.destPath);
        }
      }

      await runDb(
        "DELETE FROM project_definition_copies WHERE projectPath = ? AND definitionKey = ?",
        [currentDevProject, row.key]
      );

      db.run(
        "UPDATE definitions SET inTeam = 0, status = 'repo' WHERE id = ?",
        [row.id],
        (updateErr) => {
          if (updateErr) {
            res.status(500).json({ error: updateErr.message });
            return;
          }
          res.json({ ok: true });
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "../client", "settings.html"));
});

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
