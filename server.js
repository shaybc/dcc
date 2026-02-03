const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const { exec } = require("child_process");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const matter = require("gray-matter");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DCC_DB_PATH || path.join(__dirname, "data", "dcc.sqlite");
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
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

app.get("/api/definitions", (req, res) => {
  db.all(
    "SELECT id, key, name, description, schema, version, type, filePath, source, inTeam, status FROM definitions",
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
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
      const teamRoot = getTeamRoot();
      const destDir = path.join(teamRoot, row.type || "misc");
      await fsp.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, path.basename(row.filePath));
      await fsp.copyFile(row.filePath, destPath);
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
      const teamRoot = getTeamRoot();
      const destDir = path.join(teamRoot, row.type || "misc");
      const destPath = path.join(destDir, path.basename(row.filePath));
      if (fs.existsSync(destPath)) {
        await fsp.unlink(destPath);
      }
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
  res.sendFile(path.join(__dirname, "public", "settings.html"));
});

app.listen(PORT, () => {
  console.log(`DCC server listening on http://localhost:${PORT}`);
});
